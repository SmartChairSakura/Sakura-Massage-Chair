import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
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

    // 3. Filter transactions
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const now = new Date();
    let timeStartFilter: string | null = null;

    if (dateFrom) {
      timeStartFilter = new Date(dateFrom).toISOString();
    } else if (filterRange === 'today') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filterRange === '7d') {
      timeStartFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (filterRange === 'month') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    let slipQuery = supabaseServer
      .from('chair_slips')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterLocationId && filterLocationId !== 'ALL') {
      if (selectedLocation) {
        slipQuery = slipQuery.or(`location_id.eq.${filterLocationId},note.ilike.%${selectedLocation.name}%`);
      } else {
        slipQuery = slipQuery.eq('location_id', filterLocationId);
      }
    }

    if (timeStartFilter) {
      slipQuery = slipQuery.gte(dateColumn, timeStartFilter);
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      slipQuery = slipQuery.lte(dateColumn, endOfDay.toISOString());
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

        // Group by day for daily trend chart
        const txDate = tx[dateColumn] ? new Date(tx[dateColumn]) : new Date(tx.created_at);
        const dayKey = txDate.toISOString().slice(0, 10);
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

    // Convert dailyMap to sorted array for Trend Line Chart
    const sortedDays = Object.keys(dailyMap).sort();
    const dailyTrend = sortedDays.map((dayKey) => {
      const dayGross = dailyMap[dayKey].gross;
      const dayMdr = Math.round(dayGross * 0.007);
      const dayNet = dayGross - dayMdr;
      const dayOwnerNet = Math.round(dayNet * (ownerPct / 100));
      const dateObj = new Date(dayKey);
      const dateLabel = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      return {
        rawDate: dayKey,
        dateLabel,
        gross: dayGross,
        ownerNet: dayOwnerNet,
        transactions: dailyMap[dayKey].transactions,
      };
    });

    const onlineCount = safeChairs.filter((c) => (c.status || 'ONLINE') === 'ONLINE').length;

    return NextResponse.json({
      success: true,
      summary: {
        grossRevenue,
        mdrFee,
        netGross,
        ownerNet,
        systemNet,
        devShare: systemNet, // Alias for backward compatibility
        totalTransactions,
        onlineCount,
        totalChairs: safeChairs.length,
        ownerSharePct: ownerPct,
        systemSharePct: systemPct,
        periodChangePct: 0, // Baseline change indicator
      },
      dailyTrend,
      locations: locationList,
      chairs: safeChairs,
      transactions: chairSlipsData,
    });
  } catch (err: any) {
    console.error('[API Dashboard GET] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
