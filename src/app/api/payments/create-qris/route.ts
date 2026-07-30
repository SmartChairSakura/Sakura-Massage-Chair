import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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

    // Generate Mock QRIS URL / Payment Gateway Integration placeholder
    const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226670016ID.CO.MIDTRANS.WWW0118936009143000000000021550000000000000050303360540${amount}5802ID5910SMART_CHAIR6007JAKARTA63048F3A`;

    const transactionPayload = {
      idempotency_key: idempotencyKey,
      chair_id: chairId,
      customer_phone: customerPhone || 'GUEST',
      customer_email: customerEmail || '',
      amount: Number(amount),
      duration_minutes: Number(durationMinutes),
      pulse_count: Number(pulseCount),
      payment_method: 'QRIS',
      status: 'PENDING',
      payment_gateway_ref: `REF-${Date.now()}`,
      qr_url: mockQrUrl,
    };

    // Insert transaction into Supabase database
    const { data: createdTransaction, error: dbError } = await supabaseServer
      .from('transactions')
      .insert([transactionPayload])
      .select()
      .single();

    if (dbError) {
      console.warn('[API create-qris] Supabase DB Insert Note (fallback to in-memory response if table not yet migrated):', dbError.message);
      // Fallback response for offline/pre-migration development
      const fallbackTransaction = {
        id: crypto.randomUUID(),
        ...transactionPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        transaction: fallbackTransaction,
        note: 'Fallback mode active until Supabase migration executed.',
      });
    }

    console.log('[API create-qris] Saved transaction to Supabase:', createdTransaction.id);

    return NextResponse.json({
      success: true,
      transaction: createdTransaction,
    });
  } catch (error: any) {
    console.error('[API create-qris] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
