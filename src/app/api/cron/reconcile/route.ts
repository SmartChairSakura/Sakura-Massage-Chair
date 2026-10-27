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
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // 1. Auto-expire pending QRIS transactions older than 4 mins (3 min QRIS expiry + 1 min buffer)
    let autoExpiredCount = 0;
    try {
      const { data: expiredSlips } = await supabaseServer
        .from('chair_slips')
        .update({ status: 'expired', updated_at: nowIso })
        .eq('status', 'pending')
        .lt('created_at', fourMinutesAgo)
        .select('id');

      autoExpiredCount += (expiredSlips || []).length;

      await supabaseServer
        .from('transactions')
        .update({ status: 'EXPIRED', updated_at: nowIso })
        .eq('status', 'PENDING')
        .lt('created_at', fourMinutesAgo);
    } catch (e: any) {
      console.warn('[Cron Reconcile] Auto-expire note:', e?.message);
    }

    // 2. Fetch pending transactions between 2 and 4 mins old for status verification
    const { data: pendingSlips } = await supabaseServer
      .from('chair_slips')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', twoMinutesAgo)
      .gt('created_at', fourMinutesAgo)
      .limit(20);

    const { data: legacyPending } = await supabaseServer
      .from('transactions')
      .select('*')
      .eq('status', 'PENDING')
      .lt('created_at', twoMinutesAgo)
      .gt('created_at', fourMinutesAgo)
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
              .update({ status: statusVal, session_start_at: nowIso, updated_at: nowIso })
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
              .update({ status: statusVal, updated_at: nowIso })
              .eq('id', item.id);

            expiredCount++;
          }
        }
      }
    }

    // 3. Auto-complete abandoned session_inprocess slips whose duration + 1 min buffer has elapsed
    let autoCompletedSessions = 0;
    try {
      const { data: stuckInprocess } = await supabaseServer
        .from('chair_slips')
        .select('*')
        .eq('status', 'session_inprocess')
        .limit(20);

      if (stuckInprocess && stuckInprocess.length > 0) {
        for (const slip of stuckInprocess) {
          const durationMins = Number(slip.duration_in_minutes || 8);
          const startMs = new Date(slip.session_start_at || slip.created_at || Date.now()).getTime();
          const expectedEndMs = startMs + durationMins * 60 * 1000;

          // If expected end time + 60s grace buffer has passed, finalize to 'done'
          if (Date.now() > expectedEndMs + 60 * 1000) {
            const calculatedEndIso = new Date(expectedEndMs).toISOString();
            await supabaseServer
              .from('chair_slips')
              .update({
                status: 'done',
                session_start_at: slip.session_start_at || new Date(startMs).toISOString(),
                session_end_at: calculatedEndIso,
                updated_at: nowIso,
              })
              .eq('id', slip.id);

            autoCompletedSessions++;
          }
        }
      }
    } catch (inprocessErr: any) {
      console.warn('[Cron Reconcile] session_inprocess auto-complete note:', inprocessErr?.message);
    }

    // 4. Auto-heal any slips with status = 'done' and session_end_at IS NULL
    let healedNullEndCount = 0;
    try {
      const { data: nullEndSlips } = await supabaseServer
        .from('chair_slips')
        .select('*')
        .eq('status', 'done')
        .is('session_end_at', null)
        .limit(30);

      if (nullEndSlips && nullEndSlips.length > 0) {
        for (const slip of nullEndSlips) {
          const durationMins = Number(slip.duration_in_minutes || 8);
          const startMs = new Date(slip.session_start_at || slip.created_at || Date.now()).getTime();
          const endIso = new Date(startMs + durationMins * 60 * 1000).toISOString();
          const startIso = slip.session_start_at || new Date(startMs).toISOString();

          await supabaseServer
            .from('chair_slips')
            .update({
              session_start_at: startIso,
              session_end_at: endIso,
              updated_at: nowIso,
            })
            .eq('id', slip.id);

          healedNullEndCount++;
        }
      }
    } catch (healErr: any) {
      console.warn('[Cron Reconcile] session_end_at auto-heal note:', healErr?.message);
    }

    console.info('[Cron Reconcile] Completed run:', {
      checkedCount: itemsToReconcile.length,
      recoveredCount,
      expiredCount,
      autoExpiredCount,
      autoCompletedSessions,
      healedNullEndCount,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      telemetry: {
        checkedCount: itemsToReconcile.length,
        recoveredCount,
        expiredCount,
        autoExpiredCount,
        autoCompletedSessions,
        healedNullEndCount,
        durationMs: Date.now() - startTime,
      },
    });
  } catch (err: any) {
    console.error('[Cron Reconcile] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
