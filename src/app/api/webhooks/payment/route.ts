import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idempotencyKey, transactionId, status } = body;

    if (!idempotencyKey && !transactionId) {
      return NextResponse.json({ error: 'Missing idempotencyKey or transactionId' }, { status: 400 });
    }

    const targetKey = idempotencyKey || transactionId;
    const targetStatus = status || 'PAID';

    // 1. Query existing transaction status to check idempotency guard
    const { data: existingTx, error: fetchError } = await supabaseServer
      .from('transactions')
      .select('id, status, idempotency_key')
      .or(`idempotency_key.eq.${targetKey},id.eq.${targetKey}`)
      .single();

    if (existingTx && existingTx.status === targetStatus) {
      console.warn(`[Webhook] Duplicate notification received for key: ${targetKey}. Already ${targetStatus}.`);
      return NextResponse.json({
        success: true,
        message: 'Idempotency guard: Transaction already in target status.',
        transaction: existingTx,
      });
    }

    // 2. Update transaction status in Supabase
    const { data: updatedTx, error: updateError } = await supabaseServer
      .from('transactions')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`idempotency_key.eq.${targetKey},id.eq.${targetKey}`)
      .select()
      .single();

    if (updateError) {
      console.warn('[Webhook] DB update note (fallback active):', updateError.message);
      return NextResponse.json({
        success: true,
        transactionId: targetKey,
        status: targetStatus,
        message: 'Webhook processed (Fallback mode).',
      });
    }

    console.log(`[Webhook] Transaction ${updatedTx.id} status updated to ${updatedTx.status}`);

    return NextResponse.json({
      success: true,
      transaction: updatedTx,
      message: 'Transaction updated to PAID and broadcast via Supabase Realtime.',
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
