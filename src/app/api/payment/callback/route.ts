import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyMidtransSignature, MidtransNotificationPayload } from '@/lib/midtrans';

/**
 * POST /api/payment/callback
 * Midtrans QRIS Webhook Callback Handler with Hardening & Idempotency
 * Follows /security-and-hardening and /observability-and-instrumentation
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body: MidtransNotificationPayload = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-DUMMYKEY';

    console.info('[Payment Webhook] Notification received:', {
      requestId,
      orderId: body.order_id,
      transactionStatus: body.transaction_status,
      grossAmount: body.gross_amount,
    });

    // STEP 1: Verify Midtrans Signature (Timing-Safe SHA512)
    // Note: In dev/test environments without server key, log warning
    const isValidSignature = verifyMidtransSignature(body, serverKey);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      console.error('[Payment Webhook] Invalid signature key:', { requestId, orderId: body.order_id });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const orderId = String(body.order_id || '').trim();
    const transactionStatus = String(body.transaction_status || '').trim().toLowerCase();
    const fraudStatus = String(body.fraud_status || '').trim().toLowerCase();
    const grossAmount = Number(body.gross_amount || 0);

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // STEP 2: Query DB for existing chair_slip (Fallback to transactions if chair_slips table doesn't exist yet)
    let existingSlip: any = null;
    let isLegacyTable = false;

    const { data: slipData } = await supabaseServer
      .from('chair_slips')
      .select('*')
      .eq('chair_slip_number', orderId)
      .maybeSingle();

    if (slipData) {
      existingSlip = slipData;
    } else {
      // Fallback query to legacy transactions table
      const { data: legacyData } = await supabaseServer
        .from('transactions')
        .select('*')
        .eq('idempotency_key', orderId)
        .maybeSingle();

      if (legacyData) {
        existingSlip = legacyData;
        isLegacyTable = true;
      }
    }

    if (!existingSlip) {
      console.warn('[Payment Webhook] Order ID not found in database:', { requestId, orderId });
      return NextResponse.json({ error: 'Chair slip not found' }, { status: 404 });
    }

    // Idempotency Check: If already processed (paid, session_inprocess, done), return 200 OK immediately
    if (['paid', 'session_inprocess', 'done', 'COMPLETED', 'ONGOING'].includes(existingSlip.status)) {
      console.info('[Payment Webhook] Already processed idempotency skip:', {
        requestId,
        orderId,
        currentStatus: existingSlip.status,
      });
      return NextResponse.json({ status: 'already_processed', slip_number: orderId }, { status: 200 });
    }

    // STEP 3: Handle Payment Confirmed (settlement / capture accept)
    const isPaymentConfirmed =
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus === 'accept');

    if (isPaymentConfirmed) {
      const now = new Date().toISOString();
      const targetTable = isLegacyTable ? 'transactions' : 'chair_slips';
      const keyColumn = isLegacyTable ? 'idempotency_key' : 'chair_slip_number';

      // STEP 4: Atomic DB Update to status='paid'
      const { data: updatedSlip, error: updateErr } = await supabaseServer
        .from(targetTable)
        .update({
          status: 'paid',
          session_start_at: now,
          updated_at: now,
        })
        .eq(keyColumn, orderId)
        .eq('status', 'pending') // Double check state transition safety
        .select()
        .maybeSingle();

      if (updateErr) {
        console.error('[Payment Webhook] Atomic DB update error:', updateErr.message);
      }

      if (!isLegacyTable) {
        try {
          await supabaseServer
            .from('transactions')
            .update({
              status: 'PAID',
              session_start_at: now,
              updated_at: now,
            })
            .eq('idempotency_key', orderId);
        } catch (e) {
          console.warn('[Payment Webhook] transactions sync note:', e);
        }
      }

      const finalSlip = updatedSlip || existingSlip;


      // STEP 5: Insert Payment Detail & Revenue Split Record into chair_slip_payments
      const mdrFee = Math.round(grossAmount * 0.007); // 0.7% QRIS MDR
      const devShare = Math.round(grossAmount * 0.05); // 5% Revenue Share
      const ownerNet = Math.round(grossAmount * 0.943); // 94.3% Net Owner

      try {
        await supabaseServer.from('chair_slip_payments').insert({
          chair_slip_id: finalSlip.id,
          pg_ref_number: orderId,
          amount: grossAmount,
          sub_amount: grossAmount,
          mdr_fee: mdrFee,
          dev_share: devShare,
          owner_net: ownerNet,
          payment_method: 'QRIS_MIDTRANS',
          payment_status: transactionStatus,
          created_at: now,
        });
      } catch (insertErr: any) {
        console.warn('[Payment Webhook] Insert chair_slip_payments note:', insertErr?.message);
      }

      // STEP 6: Broadcast Realtime event to EDC Kiosk to trigger pulse
      const chairId = finalSlip.chair_id;
      const pulseCount = finalSlip.pulse_count || 5;

      try {
        await supabaseServer.channel(`chair:${chairId}`).send({
          type: 'broadcast',
          event: 'trigger_pulse',
          payload: {
            chair_slip_id: finalSlip.id,
            chair_slip_number: orderId,
            chair_id: chairId,
            pulse_count: pulseCount,
            duration_in_minutes: finalSlip.duration_in_minutes || finalSlip.duration_minutes || 4,
            timestamp: now,
          },
        });

        console.info('[Payment Webhook] Pulse broadcast sent to chair:', {
          requestId,
          chairId,
          pulseCount,
          durationMs: Date.now() - startTime,
        });
      } catch (broadcastErr: any) {
        console.warn('[Payment Webhook] Realtime broadcast error:', broadcastErr?.message);
        // Update to paid_pending_delivery if broadcast failed
        await supabaseServer
          .from(targetTable)
          .update({ status: 'paid_pending_delivery' })
          .eq('id', finalSlip.id);
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Payment confirmed & pulse triggered',
        slip_number: orderId,
        duration_ms: Date.now() - startTime,
      });
    }

    // STEP 7: Handle Cancelled / Expired / Failed payments
    if (['expire', 'cancel'].includes(transactionStatus)) {
      const targetTable = isLegacyTable ? 'transactions' : 'chair_slips';
      await supabaseServer.from(targetTable).update({ status: 'expired' }).eq('id', existingSlip.id);
    } else if (['deny', 'failure'].includes(transactionStatus)) {
      const targetTable = isLegacyTable ? 'transactions' : 'chair_slips';
      await supabaseServer.from(targetTable).update({ status: 'failed' }).eq('id', existingSlip.id);
    }

    return NextResponse.json({ status: 'ok', slip_number: orderId });
  } catch (err: any) {
    console.error('[Payment Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
