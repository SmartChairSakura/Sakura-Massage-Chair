import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
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

    // Always merge default chairs first
    DEFAULT_SAFE_CHAIRS.forEach((c) => chairMap.set(c.id, c));
    // Overlay database chairs
    dbChairs.forEach((c) => chairMap.set(c.id, c));

    const safeChairs = Array.from(chairMap.values());
    safeChairs.sort((a, b) => a.id.localeCompare(b.id));

    // 2. Query transactions with filters
    let txQuery = supabaseServer
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterChairId && filterChairId !== 'ALL') {
      txQuery = txQuery.eq('chair_id', filterChairId);
    }

    const now = new Date();
    if (filterRange === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      txQuery = txQuery.gte('created_at', todayStart);
    } else if (filterRange === '7d') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      txQuery = txQuery.gte('created_at', d7);
    } else if (filterRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      txQuery = txQuery.gte('created_at', monthStart);
    }

    const { data: transactions } = await txQuery.limit(100);
    const safeTransactions = transactions || [];

    // 3. Compute revenue split & metrics
    const validTransactions = safeTransactions.filter((tx) =>
      ['PAID', 'ONGOING', 'COMPLETED'].includes(tx.status)
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
    });
  } catch (error: any) {
    console.error('[API Admin Dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
