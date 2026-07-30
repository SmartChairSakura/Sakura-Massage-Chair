import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chairId, customerPhone, customerEmail, amount, durationMinutes, pulseCount } = body;

    if (!chairId || !amount || !durationMinutes || !pulseCount) {
      return NextResponse.json(
        { error: 'Missing required parameters: chairId, amount, durationMinutes, pulseCount' },
        { status: 400 }
      );
    }

    const idempotencyKey = `TRX-${chairId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Mock QRIS URL / Payment Gateway Integration
    const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226670016ID.CO.MIDTRANS.WWW0118936009143000000000021550000000000000050303360540${amount}5802ID5910SMART_CHAIR6007JAKARTA63048F3A`;

    const mockTransaction = {
      id: crypto.randomUUID(),
      idempotency_key: idempotencyKey,
      chair_id: chairId,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      amount,
      duration_minutes: durationMinutes,
      pulse_count: pulseCount,
      payment_method: 'QRIS',
      status: 'PENDING',
      payment_gateway_ref: `REF-${Date.now()}`,
      qr_url: mockQrUrl,
      created_at: new Date().toISOString(),
    };

    console.log('[API create-qris] Created transaction payload:', mockTransaction);

    return NextResponse.json({
      success: true,
      transaction: mockTransaction,
    });
  } catch (error) {
    console.error('[API create-qris] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
