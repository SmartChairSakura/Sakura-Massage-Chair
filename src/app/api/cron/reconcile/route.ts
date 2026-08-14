import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkMidtransTransactionStatus } from '@/lib/midtrans';

/**
 * GET /api/cron/reconcile
 * Automated Reconciliation Cron Job (Runs every 5 minutes via Vercel Cron or cron-job.org)
 * Catches stuck pending transactions and queries Midtrans Status API
 * Follows /security-and-hardening & /observability-and-instrumentation
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 1. Auto-expire pending transactions created > 15 mins ago
    try {
      await supabaseServer
        .from('chair_slips')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('created_at', fifteenMinutesAgo);

      await supabaseServer
        .from('transactions')
        .update({ status: 'EXPIRED' })
        .eq('status', 'PENDING')
        .lt('created_at', fifteenMinutesAgo);
    } catch (e: any) {
      console.warn('[Cron Reconcile] Auto-expire note:', e?.message);
    }

    // 2. Fetch pending transactions between 5 and 15 mins old
    const { data: pendingSlips } = await supabaseServer
      .from('chair_slips')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .limit(20);

    const { data: legacyPending } = await supabaseServer
      .from('transactions')
      .select('*')
      .eq('status', 'PENDING')
      .lt('created_at', fiveMinutesAgo)
      .limit(20);

    const itemsToReconcile = [
      ...(pendingSlips || []).map((s) => ({ id: s.id, orderId: s.chair_slip_number, chairId: s.chair_id, pulseCount: s.pulse_count, isLegacy: false })),
      ...(legacyPending || []).map((t) => ({ id: t.id, orderId: t.idempotency_key, chairId: t.chair_id, pulseCount: t.pulse_count, isLegacy: true })),
    ];

    let recoveredCount = 0;
    let expiredCount = 0;

    if (serverKey && itemsToReconcile.length > 0) {
      for (const item of itemsToReconcile) {
        const result = await checkMidtransTransactionStatus(item.orderId, serverKey);

        if (result.success && result.data) {
          const midtransStatus = result.data.transaction_status;

          if (['settlement', 'capture'].includes(midtransStatus)) {
            const targetTable = item.isLegacy ? 'transactions' : 'chair_slips';
            const statusVal = item.isLegacy ? 'PAID' : 'paid';

            await supabaseServer
              .from(targetTable)
              .update({ status: statusVal, session_start_at: new Date().toISOString() })
              .eq('id', item.id);

            // Broadcast pulse trigger to EDC Kiosk
            try {
              await supabaseServer.channel(`chair:${item.chairId}`).send({
                type: 'broadcast',
                event: 'trigger_pulse',
                payload: {
                  chair_slip_id: item.id,
                  chair_slip_number: item.orderId,
                  chair_id: item.chairId,
                  pulse_count: item.pulseCount || 5,
                  recovered_by_cron: true,
                },
              });
            } catch (bErr) {
              console.warn('[Cron Reconcile] Realtime broadcast error:', bErr);
            }

            recoveredCount++;
          } else if (['expire', 'cancel', 'deny'].includes(midtransStatus)) {
            const targetTable = item.isLegacy ? 'transactions' : 'chair_slips';
            const statusVal = item.isLegacy ? 'EXPIRED' : 'expired';

            await supabaseServer
              .from(targetTable)
              .update({ status: statusVal })
              .eq('id', item.id);

            expiredCount++;
          }
        }
      }
    }

    console.info('[Cron Reconcile] Completed run:', {
      checkedCount: itemsToReconcile.length,
      recoveredCount,
      expiredCount,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      telemetry: {
        checkedCount: itemsToReconcile.length,
        recoveredCount,
        expiredCount,
        durationMs: Date.now() - startTime,
      },
    });
  } catch (err: any) {
    console.error('[Cron Reconcile] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
