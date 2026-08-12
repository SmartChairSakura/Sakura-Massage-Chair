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

// POST: EDC Terminal Hardware Heartbeat Status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chairId, firmwareVersion, status } = body;

    if (!chairId) {
      return NextResponse.json({ error: 'Missing chairId' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    // Upsert chair heartbeat in Supabase
    const { data: chairData, error: upsertError } = await supabaseServer
      .from('chairs')
      .upsert(
        {
          id: chairId,
          status: status || 'ONLINE',
          last_heartbeat: timestamp,
          firmware_version: firmwareVersion || '1.0.0',
          is_active: true,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.warn('[Heartbeat] Supabase upsert note:', upsertError.message);
    }

    console.log(`[Heartbeat Ping] Chair ${chairId} is ONLINE at ${timestamp}`);

    return NextResponse.json({
      success: true,
      chairId,
      status: status || 'ONLINE',
      lastHeartbeat: timestamp,
      firmwareVersion: firmwareVersion || '1.0.0',
      chair: chairData || null,
    });
  } catch (error: any) {
    console.error('[Heartbeat] Error processing heartbeat ping:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
