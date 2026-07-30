import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chairId, firmwareVersion } = body;

    if (!chairId) {
      return NextResponse.json({ error: 'Missing chairId' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    console.log(`[Heartbeat Ping] Chair ${chairId} is ONLINE at ${timestamp}`);

    return NextResponse.json({
      success: true,
      chairId,
      status: 'ONLINE',
      lastHeartbeat: timestamp,
      firmwareVersion: firmwareVersion || '1.0.0',
    });
  } catch (error) {
    console.error('[Heartbeat] Error processing heartbeat ping:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
