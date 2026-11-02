import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sanitizePostgrestValue, verifyOptionalSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/chairs/firmware/status
 * Public OTA status telemetry callback handler for ESP32 microcontrollers
 * Receives execution status (DOWNLOADING | SUCCESS | FAILED) from ESP32 during OTA lifecycle
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
    const { chair_id, status, error: errorDetails, firmware_version } = body;

    const chairId = sanitizePostgrestValue(chair_id);
    const otaStatus = String(status || '').trim().toUpperCase();

    if (!chairId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: chair_id' },
        { status: 400 }
      );
    }

    if (!['DOWNLOADING', 'SUCCESS', 'FAILED'].includes(otaStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Expected DOWNLOADING, SUCCESS, or FAILED.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 1. Fetch current chair record to get target_firmware_version (by numeric id or chair_code)
    const chairCol = /^\d+$/.test(chairId) ? 'id' : 'chair_code';
    const { data: chairData } = await supabaseServer
      .from('chairs')
      .select('id, chair_code, target_firmware_version, firmware_version')
      .eq(chairCol, chairId)
      .maybeSingle();

    const updatePayload: Record<string, any> = {
      ota_status: otaStatus,
      last_heartbeat: now,
      updated_at: now,
    };

    if (otaStatus === 'SUCCESS') {
      const newVersion = firmware_version || chairData?.target_firmware_version || '2.2.0-ota';
      updatePayload.firmware_version = newVersion;
    }

    const { data: updatedChair, error: updateErr } = await supabaseServer
      .from('chairs')
      .update(updatePayload)
      .eq(chairCol, chairId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error('[Firmware Status Callback] DB Error:', updateErr);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    console.info(`[OTA Telemetry] Chair ${chairId} reported OTA status: ${otaStatus}`, errorDetails || '');

    return NextResponse.json({
      success: true,
      chair_id: chairId,
      ota_status: otaStatus,
      firmware_version: updatedChair?.firmware_version,
      updated_at: now,
    });
  } catch (err: any) {
    console.error('[Firmware Status Callback] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
