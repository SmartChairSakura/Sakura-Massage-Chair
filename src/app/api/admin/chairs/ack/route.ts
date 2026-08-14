import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/admin/chairs/ack
 * EDC Kiosk ACK Callback Handler
 * Receives execution acknowledgment from EDC Kiosk when pulses are delivered
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chair_slip_id, chair_slip_number, chair_id, status_event, pulses_sent } = body;

    const slipNumber = String(chair_slip_number || '').trim();
    const slipId = String(chair_slip_id || '').trim();
    const event = String(status_event || 'session_inprocess').trim().toLowerCase();

    if (!slipNumber && !slipId) {
      return NextResponse.json({ success: false, error: 'Missing chair_slip_id or chair_slip_number' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let targetStatus = 'session_inprocess';

    if (event === 'start' || event === 'session_inprocess') {
      targetStatus = 'session_inprocess';
    } else if (event === 'completed' || event === 'done') {
      targetStatus = 'done';
    } else if (event === 'failed' || event === 'expired_paid') {
      targetStatus = 'expired_paid';
    }

    // 1. Update chair_slips table
    let updated = false;
    let query = supabaseServer.from('chair_slips').update({
      status: targetStatus,
      updated_at: now,
      ...(targetStatus === 'session_inprocess' ? { session_start_at: now } : {}),
      ...(targetStatus === 'done' ? { session_end_at: now } : {}),
    });

    if (slipId) {
      query = query.eq('id', slipId);
    } else {
      query = query.eq('chair_slip_number', slipNumber);
    }

    const { data: updatedSlip, error } = await query.select().maybeSingle();

    if (updatedSlip) {
      updated = true;

      // Update chair device status to BUSY or ONLINE
      if (chair_id) {
        const deviceStatus = targetStatus === 'session_inprocess' ? 'BUSY' : 'ONLINE';
        await supabaseServer
          .from('chairs')
          .update({ status: deviceStatus, last_heartbeat: now })
          .eq('id', chair_id);
      }
    } else {
      // Fallback query to legacy transactions table
      let legacyStatus = 'ONGOING';
      if (targetStatus === 'done') legacyStatus = 'COMPLETED';
      if (targetStatus === 'expired_paid') legacyStatus = 'FAILED';

      let legacyQuery = supabaseServer.from('transactions').update({
        status: legacyStatus,
        updated_at: now,
      });

      if (slipId) {
        legacyQuery = legacyQuery.eq('id', slipId);
      } else {
        legacyQuery = legacyQuery.eq('idempotency_key', slipNumber);
      }

      const { data: legacyUpdated } = await legacyQuery.select().maybeSingle();
      if (legacyUpdated) updated = true;
    }

    console.info('[Kiosk ACK] Processed ACK:', {
      slipNumber: slipNumber || slipId,
      chairId: chair_id,
      event,
      targetStatus,
      pulses_sent,
      updated,
    });

    return NextResponse.json({
      success: true,
      updated,
      status: targetStatus,
      timestamp: now,
    });
  } catch (err: any) {
    console.error('[Kiosk ACK] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
