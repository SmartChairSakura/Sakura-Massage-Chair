import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-PIK-01', name: 'Sakura Series #04 - PIK', location_name: 'Pantai Indah Kapuk', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-LVB-01', name: 'Stagging Unit', location_name: 'Living Mall Bekasi', status: 'ONLINE', pin: '123456', is_active: true },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterChairId = searchParams.get('chairId'); // Filter per chair ID
    const filterRange = searchParams.get('range') || 'all'; // 'today', '7d', 'month', 'all'

    // 1. Fetch registered chairs from Supabase DB
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
      chairMap.set(c.id, {
        ...c,
        pin: c.pin || '123456',
        status: c.status || 'ONLINE',
      });
    });

    const safeChairs = Array.from(chairMap.values());
    safeChairs.sort((a, b) => a.id.localeCompare(b.id));

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
        slipQuery = slipQuery.eq('chair_id', filterChairId);
      }
      if (timeStartFilter) {
        slipQuery = slipQuery.gte('created_at', timeStartFilter);
      }

      const { data: slips } = await slipQuery.limit(100);
      if (slips && slips.length > 0) {
        chairSlipsData = slips.map((s) => ({
          ...s,
          idempotency_key: s.chair_slip_number || s.id,
          duration_minutes: s.duration_in_minutes || 4,
        }));
      }
    } catch (e: any) {
      console.warn('[API Admin Dashboard] chair_slips query note:', e?.message);
    }

    // Fallback or merge with legacy transactions if needed
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

        const { data: legacyTxs } = await txQuery.limit(100);
        if (legacyTxs && legacyTxs.length > 0) {
          chairSlipsData = legacyTxs.map((tx) => ({
            ...tx,
            chair_slip_number: tx.idempotency_key || tx.id,
            duration_in_minutes: tx.duration_minutes || 4,
          }));
        }
      } catch (e: any) {
        console.warn('[API Admin Dashboard] transactions query note:', e?.message);
      }
    }

    const safeTransactions = chairSlipsData || [];

    // 3. Compute revenue split & metrics
    // Valid paid statuses include: 'paid', 'session_inprocess', 'done', 'PAID', 'ONGOING', 'COMPLETED'
    const validTransactions = safeTransactions.filter((tx) =>
      ['paid', 'session_inprocess', 'done', 'PAID', 'ONGOING', 'COMPLETED'].includes(tx.status)
    );

    const grossRevenue = validTransactions.reduce(
      (acc, curr) => acc + Number(curr.amount || 0),
      0
    );

    const mdrFee = Math.round(grossRevenue * 0.007); // 0.7% MDR QRIS
    const devShare = Math.round(grossRevenue * 0.05); // 5% Revenue Share Developer
    const ownerNet = Math.round(grossRevenue * 0.943); // 94.3% Net Owner (After 5% dev & 0.7% MDR)

    const onlineCount = safeChairs.filter(
      (c) => c.status === 'ONLINE' || c.status === 'BUSY'
    ).length;

    return NextResponse.json({
      success: true,
      analytics: {
        grossRevenue,
        mdrFee,
        devShare,
        ownerNet,
        totalTransactions: validTransactions.length,
        onlineCount,
        totalChairs: safeChairs.length,
      },
      chairs: safeChairs,
      transactions: safeTransactions,
      chair_slips: safeTransactions,
    });
  } catch (error: any) {
    console.error('[API Admin Dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
