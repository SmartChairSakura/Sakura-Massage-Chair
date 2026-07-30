import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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
