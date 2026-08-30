import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idempotencyKey, transactionId, status } = body;

    if (!idempotencyKey && !transactionId) {
      return NextResponse.json({ error: 'Missing idempotencyKey or transactionId' }, { status: 400 });
    }

    const targetKey = String(idempotencyKey || transactionId).trim();
    const targetStatus = String(status || 'PAID').toUpperCase();
    const slipStatus = targetStatus === 'PAID' ? 'done' : targetStatus.toLowerCase();
    const now = new Date().toISOString();

    // 1. Query existing chair_slip record
    const { data: existingSlip } = await supabaseServer
      .from('chair_slips')
      .select('*')
      .or(`chair_slip_number.eq.${targetKey},id.eq.${targetKey}`)
      .maybeSingle();

    if (existingSlip) {
      // Idempotency check
      if (['done', 'paid', 'completed', 'session_inprocess'].includes(existingSlip.status)) {
        return NextResponse.json({
          success: true,
          message: 'Idempotency guard: Chair slip already in target status.',
          transaction: existingSlip,
        });
      }

      // Update chair_slips to 'done' and record session start time
      const { data: updatedSlip, error: updateSlipErr } = await supabaseServer
        .from('chair_slips')
        .update({
          status: 'done',
          session_start_at: now,
          updated_at: now,
        })
        .eq('id', existingSlip.id)
        .select()
        .maybeSingle();

      if (updateSlipErr) {
        console.warn('[Webhook] chair_slips update error:', updateSlipErr.message);
      }

      // Insert payment split record into chair_slip_payments
      const grossAmt = Number(existingSlip.amount || 0);
      const mdrFee = Math.round(grossAmt * 0.007);
      const devShare = Math.round(grossAmt * 0.05);
      const ownerNet = grossAmt - mdrFee - devShare;

      try {
        await supabaseServer.from('chair_slip_payments').insert({
          chair_slip_id: existingSlip.id,
          pg_ref_number: targetKey,
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
    }

    // 2. Also update legacy transactions table
    const { data: updatedTx, error: updateError } = await supabaseServer
      .from('transactions')
      .update({
        status: targetStatus,
        updated_at: now,
      })
      .or(`idempotency_key.eq.${targetKey},id.eq.${targetKey}`)
      .select()
      .maybeSingle();

    console.log(`[Webhook] Transaction & Slip ${targetKey} status updated to ${targetStatus} / done`);

    return NextResponse.json({
      success: true,
      transaction: updatedTx || existingSlip,
      message: 'Transaction & Chair Slip updated to PAID / done successfully.',
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
