import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';
import {
  getWibNow,
  getWibDateRange,
  getWibDateKey,
  getWibDateSequence,
  getPreviousWibDateRange,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to continue.' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const filterLocationId = searchParams.get('location_id') || searchParams.get('locationId') || searchParams.get('chairId');
    const filterRange = searchParams.get('range') || 'all';
    const dateType = searchParams.get('date_type') === 'settled_at' ? 'settled_at' : 'created_at';
    const dateColumn = dateType === 'settled_at' ? 'updated_at' : 'created_at';

    // 1. Fetch active locations
    const { data: locations } = await supabaseServer
      .from('locations')
      .select('*')
      .is('deleted_at', null);

    const locationList = locations || [];
    const selectedLocation = locationList.find((l: any) => l.id === filterLocationId);

    // Dynamic revenue split percentages (default: 95% Owner / 5% System)
    const ownerPct = selectedLocation ? Number(selectedLocation.owner_share_pct) : 95.0;
    const systemPct = selectedLocation ? Number(selectedLocation.system_share_pct) : 5.0;

    // 2. Fetch registered active chairs
    let chairQuery = supabaseServer
      .from('chairs')
      .select('*')
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (filterLocationId && filterLocationId !== 'ALL') {
      if (selectedLocation) {
        chairQuery = chairQuery.or(`location_id.eq.${filterLocationId},location_name.eq.${selectedLocation.name}`);
      } else {
        chairQuery = chairQuery.eq('location_id', filterLocationId);
      }
    }

    const { data: chairs } = await chairQuery;
    const safeChairs = (chairs || []).map((c: any) => ({
      ...c,
      chair_code: c.chair_code || String(c.id),
      model_type: c.model_type || 'Tokuyo TC-355',
      pin: c.pin || '123456',
      status: c.status || 'ONLINE',
    }));

    // 3. Filter transactions with WIB (UTC+7) timezone precision
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const timeFrom = searchParams.get('time_from') || '00:00';
    const timeTo = searchParams.get('time_to') || '23:59';

    const { startIso, endIso } = getWibDateRange(filterRange, dateFrom, dateTo, timeFrom, timeTo);

    let slipQuery = supabaseServer
      .from('chair_slips')
      .select('*')
      .order('created_at', { ascending: false });

    // Robust location scoping (matching location_id OR known chair codes for location)
    if (filterLocationId && filterLocationId !== 'ALL') {
      const chairCodes = safeChairs.map((c: any) => c.chair_code).filter(Boolean);
      if (chairCodes.length > 0) {
        slipQuery = slipQuery.or(
          `location_id.eq.${filterLocationId},chair_code.in.(${chairCodes.join(',')}),chair_id.in.(${chairCodes.join(',')})`
        );
      } else {
        slipQuery = slipQuery.eq('location_id', filterLocationId);
      }
    }

    if (startIso) {
      slipQuery = slipQuery.gte(dateColumn, startIso);
    }

    if (endIso) {
      slipQuery = slipQuery.lte(dateColumn, endIso);
    }

    const { data: slips } = await slipQuery;
    const chairSlipsData = slips || [];

    // 4. Compute Financial Analytics Metrics (QRIS 100%, 0.7% MDR Fee)
    let grossRevenue = 0;
    let totalTransactions = 0;
    const dailyMap: Record<string, { gross: number; transactions: number }> = {};

    chairSlipsData.forEach((tx) => {
      const st = String(tx.status || '').toLowerCase();
      if (['done', 'completed', 'paid', 'ongoing', 'session_inprocess'].includes(st)) {
        const amt = Number(tx.amount || 0);
        grossRevenue += amt;
        totalTransactions += 1;

        // Group by day for daily trend chart in WIB timezone
        const txDate = tx[dateColumn] ? new Date(tx[dateColumn]) : new Date(tx.created_at);
        const dayKey = getWibDateKey(txDate) || txDate.toISOString().slice(0, 10);
        if (!dailyMap[dayKey]) {
          dailyMap[dayKey] = { gross: 0, transactions: 0 };
        }
        dailyMap[dayKey].gross += amt;
        dailyMap[dayKey].transactions += 1;
      }
    });

    const mdrFee = Math.round(grossRevenue * 0.007); // 0.7% QRIS MDR
    const netGross = grossRevenue - mdrFee;
    const ownerNet = Math.round(netGross * (ownerPct / 100));
    const systemNet = netGross - ownerNet;

    // Generate contiguous daily sequence and zero-fill missing dates
    let targetDays: string[] = [];
    const wibNow = getWibNow();
    const todayKey = getWibDateKey(wibNow);

    if (startIso && endIso) {
      const sKey = getWibDateKey(startIso);
      const eKey = getWibDateKey(endIso);
      targetDays = getWibDateSequence(sKey, eKey, 62);
    } else {
      // 'all' time: find min transaction date up to today (or past 14-30 days if no txs)
      const existingKeys = Object.keys(dailyMap).sort();
      if (existingKeys.length > 0) {
        const earliest = existingKeys[0];
        targetDays = getWibDateSequence(earliest, todayKey, 60);
        // Ensure any outlier dates are preserved
        const daySet = new Set(targetDays);
        existingKeys.forEach((k) => daySet.add(k));
        targetDays = Array.from(daySet).sort();
      } else {
        // Fallback: last 7 days ending today
        const past7 = new Date(wibNow.getTime() - 6 * 24 * 3600000);
        targetDays = getWibDateSequence(getWibDateKey(past7), todayKey, 7);
      }
    }

    const dailyTrend = targetDays.map((dayKey) => {
      const dayData = dailyMap[dayKey] || { gross: 0, transactions: 0 };
      const dayGross = dayData.gross;
      const dayMdr = Math.round(dayGross * 0.007);
      const dayNet = dayGross - dayMdr;
      const dayOwnerNet = Math.round(dayNet * (ownerPct / 100));
      const dateObj = new Date(`${dayKey}T00:00:00+07:00`);
      const dateLabel = isNaN(dateObj.getTime())
        ? dayKey
        : dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      return {
        rawDate: dayKey,
        dateLabel,
        grossSales: dayGross,
        gross: dayGross,
        ownerNet: dayOwnerNet,
        ticketCount: dayData.transactions,
        transactions: dayData.transactions,
      };
    });

    // 5. Compute Previous Period Comparison for Delta Metric
    let periodChangePct: number | null = null;
    const { prevStartIso, prevEndIso } = getPreviousWibDateRange(filterRange, startIso, endIso);

    if (prevStartIso && prevEndIso && filterRange !== 'all') {
      try {
        let prevQuery = supabaseServer
          .from('chair_slips')
          .select('amount, status')
          .gte(dateColumn, prevStartIso)
          .lte(dateColumn, prevEndIso);

        if (filterLocationId && filterLocationId !== 'ALL') {
          const chairCodes = safeChairs.map((c: any) => c.chair_code).filter(Boolean);
          if (chairCodes.length > 0) {
            prevQuery = prevQuery.or(
              `location_id.eq.${filterLocationId},chair_code.in.(${chairCodes.join(',')}),chair_id.in.(${chairCodes.join(',')})`
            );
          } else {
            prevQuery = prevQuery.eq('location_id', filterLocationId);
          }
        }

        const { data: prevSlips } = await prevQuery;
        let prevGross = 0;
        (prevSlips || []).forEach((tx: any) => {
          const st = String(tx.status || '').toLowerCase();
          if (['done', 'completed', 'paid', 'ongoing', 'session_inprocess'].includes(st)) {
            prevGross += Number(tx.amount || 0);
          }
        });

        if (prevGross > 0) {
          periodChangePct = Math.round(((grossRevenue - prevGross) / prevGross) * 100);
        } else if (grossRevenue > 0) {
          periodChangePct = 100;
        } else {
          periodChangePct = 0;
        }
      } catch (e) {
        console.warn('[API Dashboard] Previous period comparison query failed:', e);
        periodChangePct = null;
      }
    }

    const onlineCount = safeChairs.filter((c) => (c.status || 'ONLINE') === 'ONLINE').length;

    return NextResponse.json(
      {
        success: true,
        summary: {
          gross_sales: grossRevenue,
          mdr_fee: mdrFee,
          net_sales: netGross,
          owner_net: ownerNet,
          system_share: systemNet,
          total_tickets: totalTransactions,
          online_fleet: onlineCount,
          total_fleet: safeChairs.length,
          owner_share_pct: ownerPct,
          system_share_pct: systemPct,
          period_change_pct: periodChangePct,

          // Legacy camelCase keys for 100% backward compatibility
          grossRevenue,
          mdrFee,
          netGross,
          ownerNet,
          systemNet,
          devShare: systemNet,
          totalTransactions,
          onlineCount,
          totalChairs: safeChairs.length,
          ownerSharePct: ownerPct,
          systemSharePct: systemPct,
          periodChangePct: periodChangePct,
        },
        dailyTrend,
        locations: locationList,
        chairs: safeChairs,
        transactions: chairSlipsData,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[API Dashboard GET] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
