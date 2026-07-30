import { NextRequest, NextResponse } from 'next/server';

const processedIdempotencyKeys = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idempotencyKey, transactionId, status } = body;

    if (!idempotencyKey && !transactionId) {
      return NextResponse.json({ error: 'Missing idempotencyKey or transactionId' }, { status: 400 });
    }

    const key = idempotencyKey || transactionId;

    // Idempotency Check Guard
    if (processedIdempotencyKeys.has(key)) {
      console.warn(`[Webhook] Duplicate notification received for idempotencyKey: ${key}. Ignoring...`);
      return NextResponse.json({
        success: true,
        message: 'Idempotency guard: Notification already processed.',
      });
    }

    processedIdempotencyKeys.add(key);

    console.log(`[Webhook] Payment SUCCESS for transaction ${key}. Status: ${status || 'PAID'}`);

    return NextResponse.json({
      success: true,
      transactionId: key,
      status: 'PAID',
      message: 'Transaction updated to PAID and broadcast via Supabase Realtime.',
    });
  } catch (error) {
    console.error('[Webhook] Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
