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
    const slipStatus = targetStatus === 'PAID' ? 'paid' : targetStatus.toLowerCase();
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

    let finalSlip = existingSlip;

    if (existingSlip) {
      const durationMins = Number(existingSlip.duration_in_minutes || 8);
      const startIso = existingSlip.session_start_at || now;

      const updatePayload: Record<string, any> = {
        status: slipStatus,
        session_start_at: startIso,
        updated_at: now,
      };

      if (slipStatus === 'done') {
        updatePayload.session_end_at = existingSlip.session_end_at || new Date(new Date(startIso).getTime() + durationMins * 60 * 1000).toISOString();
      }

      // Update chair_slips table
      const { data: updatedSlip, error: updateSlipErr } = await supabaseServer
        .from('chair_slips')
        .update(updatePayload)
        .eq('id', existingSlip.id)
        .select()
        .maybeSingle();

      if (updateSlipErr) {
        console.warn('[Webhook] chair_slips update error:', updateSlipErr.message);
      } else if (updatedSlip) {
        finalSlip = updatedSlip;
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
    let txQuery = supabaseServer.from('transactions').update({
      status: targetStatus,
      updated_at: now,
    });

    if (isUuid) {
      txQuery = txQuery.or(`idempotency_key.eq.${targetKey},id.eq.${targetKey}`);
    } else {
      txQuery = txQuery.eq('idempotency_key', targetKey);
    }

    const { data: updatedTx } = await txQuery.select().maybeSingle();

    console.log(`[Webhook] Transaction & Slip ${targetKey} status updated to ${targetStatus} / ${slipStatus}`);

    return NextResponse.json({
      success: true,
      transaction: updatedTx || finalSlip,
      message: `Transaction & Chair Slip updated to ${targetStatus} / ${slipStatus} successfully.`,
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
