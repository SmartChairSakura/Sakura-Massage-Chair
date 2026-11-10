import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sanitizePostgrestValue, verifyOptionalSecret } from '@/lib/security';

/**
 * POST /api/admin/chairs/ack
 * EDC Kiosk ACK Callback Handler
 * Receives execution acknowledgment from EDC Kiosk when pulses are delivered
 */
export async function POST(req: NextRequest) {
  try {
    if (
      !verifyOptionalSecret(
        req.headers.get('x-device-key') || req.headers.get('authorization'),
        process.env.IOT_DEVICE_SECRET
      )
    ) {
      return NextResponse.json({ success: false, error: 'Unauthorized device' }, { status: 401 });
    }

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

    // 1. Fetch existing chair_slip to verify start time and duration
    let lookupQuery = supabaseServer.from('chair_slips').select('*');
    if (slipId) {
      lookupQuery = lookupQuery.eq('id', slipId);
    } else {
      lookupQuery = lookupQuery.eq('chair_slip_number', slipNumber);
    }
    const { data: existingSlip } = await lookupQuery.maybeSingle();

    const durationMins = Number(existingSlip?.duration_in_minutes || 8);
    const slipStartIso = existingSlip?.session_start_at;

    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updated_at: now,
    };

    if (targetStatus === 'session_inprocess') {
      updatePayload.session_start_at = slipStartIso || now;
    } else if (targetStatus === 'done') {
      updatePayload.session_end_at = now;
      if (!slipStartIso) {
        // Fallback: If session_start_at was never recorded, calculate it from duration
        updatePayload.session_start_at = new Date(Date.now() - durationMins * 60 * 1000).toISOString();
      }
    }

    // 2. Update chair_slips table
    let updated = false;
    let query = supabaseServer.from('chair_slips').update(updatePayload);

    if (slipId) {
      query = query.eq('id', slipId);
    } else {
      query = query.eq('chair_slip_number', slipNumber);
    }

    const { data: updatedSlip, error } = await query.select().maybeSingle();

    if (updatedSlip) {
      updated = true;

      // Update chair device status to BUSY or ONLINE (match by numeric id or chair_code)
      if (chair_id) {
        const cleanChairId = sanitizePostgrestValue(chair_id);
        const chairCol = /^\d+$/.test(cleanChairId) ? 'id' : 'chair_code';
        const deviceStatus = targetStatus === 'session_inprocess' ? 'BUSY' : 'ONLINE';
        await supabaseServer
          .from('chairs')
          .update({ status: deviceStatus, last_heartbeat: now })
          .eq(chairCol, cleanChairId);
      }
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
