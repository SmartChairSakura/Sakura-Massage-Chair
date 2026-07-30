import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch chairs fleet status
    const { data: chairs, error: chairsError } = await supabaseServer
      .from('chairs')
      .select('*')
      .order('id', { ascending: true });

    // 2. Fetch recent transactions
    const { data: transactions, error: txError } = await supabaseServer
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const safeChairs = chairs || [
      { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
      { id: 'SAKURA-GI-02', name: 'Sakura Series #02', location_name: 'Grand Indonesia Lt 3', status: 'BUSY', is_active: true, created_at: new Date().toISOString() },
      { id: 'SAKURA-CP-01', name: 'Sakura Series #03', location_name: 'Central Park Fl 1', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
      { id: 'SAKURA-STG-01', name: 'Sakura Staging Unit', location_name: 'Testing Environment', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
    ];

    const safeTransactions = transactions || [];

    // 3. Compute revenue analytics
    const totalRevenue = safeTransactions.reduce(
      (acc, curr) =>
        acc + (['PAID', 'ONGOING', 'COMPLETED'].includes(curr.status) ? Number(curr.amount || 0) : 0),
      0
    );

    const onlineCount = safeChairs.filter(
      (c) => c.status === 'ONLINE' || c.status === 'BUSY'
    ).length;

    return NextResponse.json({
      success: true,
      analytics: {
        totalRevenue,
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
