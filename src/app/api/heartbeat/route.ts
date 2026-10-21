import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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
    const body = await req.json();
    const chairId = body.chairId || body.chair_id;
    const firmwareVersion = body.firmwareVersion || body.firmware_version || '1.0.0';
    const status = body.status || 'ONLINE';
    const rssi = body.rssi ? Number(body.rssi) : undefined;
    const ipAddress = body.ip || body.ipAddress || body.ip_address;

    if (!chairId) {
      return NextResponse.json({ error: 'Missing required field: chairId or chair_id' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const upsertPayload: Record<string, any> = {
      id: chairId,
      status,
      last_heartbeat: timestamp,
      firmware_version: firmwareVersion,
      is_active: true,
    };
    if (ipAddress) upsertPayload.ip_address = ipAddress;
    if (rssi !== undefined) upsertPayload.rssi = rssi;

    // Upsert chair heartbeat in Supabase
    const { data: chairData, error: upsertError } = await supabaseServer
      .from('chairs')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (upsertError) {
      console.warn('[Heartbeat] Supabase upsert note:', upsertError.message);
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
