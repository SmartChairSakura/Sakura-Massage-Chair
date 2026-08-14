import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', chair_code: 'SAKURA-GI-01', name: 'Sakura Series #01', model_type: 'Tokuyo TC-355', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', chair_code: 'SAKURA-CP-01', name: 'Sakura Series #02', model_type: 'Tokuyo TC-355', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', chair_code: 'SAKURA-MOI-01', name: 'Sakura Series #03', model_type: 'Tokuyo TC-355', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-PIK-01', chair_code: 'SAKURA-PIK-01', name: 'Sakura Series #04 - PIK', model_type: 'Tokuyo TC-355', location_name: 'Pantai Indah Kapuk', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-LVB-01', chair_code: 'SAKURA-LVB-01', name: 'Stagging Unit', model_type: 'Tokuyo TC-355', location_name: 'Living Mall Bekasi', status: 'ONLINE', pin: '123456', is_active: true },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterChairId = searchParams.get('chairId'); // Filter per chair ID
    const filterRange = searchParams.get('range') || 'all'; // 'today', '7d', 'month', 'all'

    // 1. Fetch registered chairs from Supabase DB (excluding soft-deleted chairs)
    const { data: chairs } = await supabaseServer
      .from('chairs')
      .select('*')
      .order('id', { ascending: true });

    const dbChairs = chairs || [];
    const chairMap = new Map<string, any>();

    // Merge default chairs first
    DEFAULT_SAFE_CHAIRS.forEach((c) => chairMap.set(c.id, c));

    // Overlay database chairs (Supabase DB is single source of truth)
    dbChairs.forEach((c) => {
      const codeKey = c.chair_code || String(c.id);
      if (c.deleted_at) {
        // Explicitly remove soft-deleted chairs from the map
        chairMap.delete(String(c.id));
        chairMap.delete(codeKey);
      } else {
        chairMap.set(codeKey, {
          ...c,
          chair_code: codeKey,
          model_type: c.model_type || 'Tokuyo TC-355',
          pin: c.pin || '123456',
          status: c.status || 'ONLINE',
        });
      }
    });

    const safeChairs = Array.from(chairMap.values());
    safeChairs.sort((a, b) => String(a.chair_code || a.id).localeCompare(String(b.chair_code || b.id)));

    // 2. Query chair_slips or legacy transactions with filters
    const now = new Date();
    let timeStartFilter: string | null = null;

    if (filterRange === 'today') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filterRange === '7d') {
      timeStartFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (filterRange === 'month') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // Try querying chair_slips table first
    let chairSlipsData: any[] = [];
    try {
      let slipQuery = supabaseServer
        .from('chair_slips')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterChairId && filterChairId !== 'ALL') {
        slipQuery = slipQuery.or(`chair_id.eq.${filterChairId},chair_code.eq.${filterChairId}`);
      }
      if (timeStartFilter) {
        slipQuery = slipQuery.gte('created_at', timeStartFilter);
      }

      const { data: slips } = await slipQuery;
      if (slips) chairSlipsData = slips;
    } catch (e) {
      console.warn('[API Admin Dashboard] chair_slips query note:', e);
    }

    // Fallback to legacy transactions if chair_slips is empty
    if (chairSlipsData.length === 0) {
      try {
        let txQuery = supabaseServer
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (filterChairId && filterChairId !== 'ALL') {
          txQuery = txQuery.eq('chair_id', filterChairId);
        }
        if (timeStartFilter) {
          txQuery = txQuery.gte('created_at', timeStartFilter);
        }

        const { data: legacyTxs } = await txQuery;
        if (legacyTxs) chairSlipsData = legacyTxs;
      } catch (e) {
        console.warn('[API Admin Dashboard] legacy transactions query note:', e);
      }
    }

    // 3. Compute Financial Analytics Metrics (PARKEE Revenue Split: MDR 0.7%, Dev Share 5%, Owner Net 94.3%)
    let grossRevenue = 0;
    let totalTransactions = 0;

    chairSlipsData.forEach((tx) => {
      const st = String(tx.status || '').toLowerCase();
      if (st === 'done' || st === 'completed' || st === 'paid' || st === 'ongoing' || st === 'session_inprocess') {
        grossRevenue += Number(tx.amount || 0);
        totalTransactions += 1;
      }
    });

    const mdrFee = Math.round(grossRevenue * 0.007);
    const devShare = Math.round(grossRevenue * 0.05);
    const ownerNet = grossRevenue - mdrFee - devShare;

    const onlineCount = safeChairs.filter((c) => (c.status || 'ONLINE') === 'ONLINE').length;

    return NextResponse.json({
      success: true,
      summary: {
        grossRevenue,
        mdrFee,
        devShare,
        ownerNet,
        totalTransactions,
        onlineCount,
        totalChairs: safeChairs.length,
      },
      chairs: safeChairs,
      transactions: chairSlipsData,
    });
  } catch (err: any) {
    console.error('[API Admin Dashboard] GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
