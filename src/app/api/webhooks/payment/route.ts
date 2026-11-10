import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkMidtransTransactionStatus } from '@/lib/midtrans';

const ALREADY_PAID_STATUSES = ['paid', 'paid_pending_delivery', 'session_inprocess', 'done', 'completed'];

/**
 * POST /api/webhooks/payment
 * "Saya sudah bayar" verification for the web kiosk.
 * The client can no longer self-declare PAID: the slip is only settled when the
 * Midtrans Status API confirms settlement AND the gross amount matches the slip.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idempotencyKey, transactionId } = body;

    if (!idempotencyKey && !transactionId) {
      return NextResponse.json({ error: 'Missing idempotencyKey or transactionId' }, { status: 400 });
    }

    const targetKey = String(idempotencyKey || transactionId).trim();
    const now = new Date().toISOString();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetKey);

    // 1. Query existing chair_slip record
    let slipQuery = supabaseServer.from('chair_slips').select('*');
    if (isUuid) {
      slipQuery = slipQuery.or(`chair_slip_number.eq.${targetKey},id.eq.${targetKey}`);
    } else {
      slipQuery = slipQuery.eq('chair_slip_number', targetKey);
    }

    const { data: existingSlip, error: slipQueryErr } = await slipQuery.maybeSingle();

    if (slipQueryErr) {
      console.warn('[Webhook] chair_slips lookup note:', slipQueryErr.message);
    }

    if (!existingSlip) {
      return NextResponse.json({ success: false, error: 'Chair slip not found' }, { status: 404 });
    }

    // Idempotent: already settled (e.g. by the Midtrans callback) -> nothing to do
    if (ALREADY_PAID_STATUSES.includes(String(existingSlip.status || '').toLowerCase())) {
      return NextResponse.json({ success: true, transaction: existingSlip, message: 'Already paid' });
    }

    // 2. Verify with Midtrans Status API (source of truth)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('[Webhook] MIDTRANS_SERVER_KEY is not configured; cannot verify payment');
      return NextResponse.json({ success: false, error: 'Payment verification unavailable' }, { status: 503 });
    }

    const orderId = existingSlip.chair_slip_number;
    const statusResult = await checkMidtransTransactionStatus(orderId, serverKey);
    const mt = statusResult.data || {};
    const transactionStatus = String(mt.transaction_status || '').toLowerCase();
    const fraudStatus = String(mt.fraud_status || '').toLowerCase();
    const isSettled =
      transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept');
    const amountMatches = Math.round(Number(mt.gross_amount)) === Math.round(Number(existingSlip.amount));

    if (!statusResult.success || !isSettled || !amountMatches) {
      console.info('[Webhook] Payment not confirmed by Midtrans:', {
        orderId,
        transactionStatus,
        amountMatches,
        error: statusResult.error,
      });
      return NextResponse.json({ success: false, error: 'Payment not detected yet' });
    }

    // 3. Settle chair_slips
    const { data: updatedSlip, error: updateSlipErr } = await supabaseServer
      .from('chair_slips')
      .update({
        status: 'paid',
        session_start_at: existingSlip.session_start_at || now,
        updated_at: now,
      })
      .eq('id', existingSlip.id)
      .select()
      .maybeSingle();

    if (updateSlipErr) {
      console.warn('[Webhook] chair_slips update error:', updateSlipErr.message);
    }

    // Insert payment split record into chair_slip_payments (Model 1: 95% Owner / 5% System on Net Gross after 0.7% MDR)
    const grossAmt = Number(existingSlip.amount || 0);
    const mdrFee = Math.round(grossAmt * 0.007);
    const netGross = grossAmt - mdrFee;
    const devShare = Math.round(netGross * 0.05);
    const ownerNet = netGross - devShare;

    try {
      await supabaseServer.from('chair_slip_payments').insert({
        chair_slip_id: existingSlip.id,
        pg_ref_number: orderId,
        amount: grossAmt,
        sub_amount: grossAmt,
        mdr_fee: mdrFee,
        dev_share: devShare,
        owner_net: ownerNet,
        payment_method: 'QRIS',
        payment_status: 'SETTLEMENT',
        created_at: now,
      });
    } catch (payErr: any) {
      console.warn('[Webhook] chair_slip_payments insert note:', payErr?.message);
    }

    console.log(`[Webhook] Slip ${orderId} verified via Midtrans and marked PAID`);

    return NextResponse.json({
      success: true,
      transaction: updatedSlip || existingSlip,
      message: 'Payment verified and chair slip marked PAID.',
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
