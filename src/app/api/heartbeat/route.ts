import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sanitizePostgrestValue, verifyOptionalSecret } from '@/lib/security';

// GET: Heartbeat Ping & Supabase Database Keep-Alive (Prevents Supabase Free Tier Auto-Pause)
export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseServer
      .from('chairs')
      .select('id')
      .limit(1);

    const isConnected = !error;
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status: isConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      supabase_connected: isConnected,
      supabase_error: error ? error.message : null,
      response_time_ms: durationMs,
      message: 'Sakura Zen Kiosk Keep-Alive Heartbeat Active',
    });
  } catch (err: any) {
    console.error('[Heartbeat GET] Error:', err);
    return NextResponse.json(
      { status: 'unhealthy', error: err?.message || 'Server Exception' },
      { status: 500 }
    );
  }
}

// POST: EDC / IoT Hardware Heartbeat Status (ESP32 & Android)
export async function POST(req: NextRequest) {
  try {
    if (
      !verifyOptionalSecret(
        req.headers.get('x-device-key') || req.headers.get('authorization'),
        process.env.IOT_DEVICE_SECRET
      )
    ) {
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 });
    }

    const body = await req.json();
    const chairId = sanitizePostgrestValue(body.chairId || body.chair_id);
    const firmwareVersion = String(body.firmwareVersion || body.firmware_version || '1.0.0').trim();
    const rawStatus = String(body.status || 'ONLINE').trim().toUpperCase();
    const status = ['ONLINE', 'BUSY', 'OFFLINE', 'MAINTENANCE'].includes(rawStatus) ? rawStatus : 'ONLINE';
    const rssi = body.rssi ? Number(body.rssi) : undefined;
    const ipAddress = body.ip || body.ipAddress || body.ip_address;

    if (!chairId) {
      return NextResponse.json({ error: 'Missing required field: chairId or chair_id' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status,
      last_heartbeat: timestamp,
      firmware_version: firmwareVersion,
      is_active: true,
    };
    if (ipAddress) updatePayload.ip_address = String(ipAddress).trim();
    if (rssi !== undefined) updatePayload.rssi = rssi;

    // Update existing registered chair by chair_code or numeric id (prevents arbitrary row creation)
    const lookupCol = /^\d+$/.test(chairId) ? 'id' : 'chair_code';
    const { data: chairData, error: upsertError } = await supabaseServer
      .from('chairs')
      .update(updatePayload)
      .eq(lookupCol, chairId)
      .select()
      .maybeSingle();

    if (upsertError) {
      console.warn('[Heartbeat] Supabase update note:', upsertError.message);
    }

    console.log(`[Heartbeat Ping] Chair ${chairId} is ${status} at ${timestamp}`);

    return NextResponse.json({
      success: true,
      chair_id: chairId,
      chairId,
      status,
      last_heartbeat: timestamp,
      lastHeartbeat: timestamp,
      firmware_version: firmwareVersion,
      firmwareVersion,
      chair: chairData || null,
    });
  } catch (error: any) {
    console.error('[Heartbeat] Error processing heartbeat ping:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
