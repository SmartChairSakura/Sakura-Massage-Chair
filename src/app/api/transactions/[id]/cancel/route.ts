import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sanitizePostgrestValue } from '@/lib/security';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = sanitizePostgrestValue(params.id);
    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
    const timestamp = new Date().toISOString();

    // 1. Update master table chair_slips
    let updatedSlip: { id?: string; chair_id?: string | number | null; chair_code?: string | null } | null = null;
    try {
      let slipUpdate = supabaseServer
        .from('chair_slips')
        .update({
          status: 'cancelled',
          cancelled_at: timestamp,
          session_end_at: timestamp,
          updated_at: timestamp,
        });
      slipUpdate = isUuid
        ? slipUpdate.or(`id.eq.${transactionId},chair_slip_number.eq.${transactionId}`)
        : slipUpdate.eq('chair_slip_number', transactionId);
      const { data, error: slipErr } = await slipUpdate
        .select('id, chair_id, chair_code')
        .maybeSingle();
      if (slipErr) {
        console.warn('[Cancel Session] chair_slips cancel note:', slipErr.message);
      }
      updatedSlip = data;
    } catch (slipErr: any) {
      console.warn('[Cancel Session] chair_slips cancel note:', slipErr?.message);
    }

    // Reset chair status to ONLINE if specified on the cancelled slip
    const rawChairRef = updatedSlip?.chair_code || updatedSlip?.chair_id;
    if (rawChairRef !== undefined && rawChairRef !== null) {
      const cleanChairRef = sanitizePostgrestValue(rawChairRef);
      if (cleanChairRef) {
        const chairCol = /^\d+$/.test(cleanChairRef) ? 'id' : 'chair_code';
        await supabaseServer
          .from('chairs')
          .update({ status: 'ONLINE' })
          .eq(chairCol, cleanChairRef);
      }
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
