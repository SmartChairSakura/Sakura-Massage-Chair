import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterChairId = searchParams.get('chairId');
    const filterRange = searchParams.get('range') || 'all';

    // 1. Fetch registered chairs from DB only (DB is single source of truth)
    const { data: chairs, error: chairsError } = await supabaseServer
      .from('chairs')
      .select('*')
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (chairsError) {
      console.error('[API Dashboard] chairs query error:', chairsError.message);
    }

    const safeChairs = (chairs || []).map((c: any) => ({
      ...c,
      chair_code: c.chair_code || String(c.id),
      model_type: c.model_type || 'Tokuyo TC-355',
      pin: c.pin || '123456',
      status: c.status || 'ONLINE',
    }));

    // 2. Query chair_slips with optional filters
    const now = new Date();
    let timeStartFilter: string | null = null;

    if (filterRange === 'today') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filterRange === '7d') {
      timeStartFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (filterRange === 'month') {
      timeStartFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

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
      console.warn('[API Dashboard] chair_slips query note:', e);
    }

    // 3. Compute Financial Analytics Metrics (PARKEE Revenue Split)
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
    console.error('[API Dashboard] GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
