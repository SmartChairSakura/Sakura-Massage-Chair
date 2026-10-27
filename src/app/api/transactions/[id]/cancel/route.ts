import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    // 1. Update master table chair_slips
    try {
      await supabaseServer
        .from('chair_slips')
        .update({
          status: 'cancelled',
          cancelled_at: timestamp,
          session_end_at: timestamp,
          updated_at: timestamp,
        })
        .or(`id.eq.${transactionId},chair_slip_number.eq.${transactionId}`);
    } catch (slipErr: any) {
      console.warn('[Cancel Session] chair_slips cancel note:', slipErr?.message);
    }

    // 2. Update legacy transactions table
    const { data: updatedTx, error: updateError } = await supabaseServer
      .from('transactions')
      .update({
        status: 'CANCELLED',
        cancelled_at: timestamp,
        updated_at: timestamp,
      })
      .or(`id.eq.${transactionId},idempotency_key.eq.${transactionId}`)
      .select()
      .maybeSingle();

    if (updateError) {
      console.warn('[Cancel Session] DB update note:', updateError.message);
    }

    // Reset chair status to ONLINE if specified
    if (updatedTx?.chair_id) {
      await supabaseServer
        .from('chairs')
        .update({ status: 'ONLINE' })
        .eq('id', updatedTx.chair_id);
    }

    return NextResponse.json({
      success: true,
      transactionId,
      status: 'CANCELLED',
      cancelledAt: timestamp,
    });
  } catch (error: any) {
    console.error('[Cancel Session] Error processing session cancel:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
