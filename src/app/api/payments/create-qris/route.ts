import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createMidtransQrisCharge } from '@/lib/midtrans';

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

    // Lookup chair unit details from chairs table
    const cleanChairId = String(chairId).trim();
    const { data: chairData } = await supabaseServer
      .from('chairs')
      .select('*')
      .or(`chair_code.eq.${cleanChairId},id.eq.${cleanChairId}`)
      .is('deleted_at', null)
      .maybeSingle();

    const chairCode = chairData ? chairData.chair_code : cleanChairId;
    const locationId = chairData ? chairData.location_id : null;
    const locationName = chairData ? chairData.location_name : '';

    const idempotencyKey = `TRX-${chairCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Generate QRIS URL (Midtrans API or fallback to Mock)
    const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226670016ID.CO.MIDTRANS.WWW0118936009143000000000021550000000000000050303360540${amount}5802ID5910SMART_CHAIR6007JAKARTA63048F3A`;
    let activeQrUrl = mockQrUrl;
    let qrString = '';

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    let midtransDebug: any = null;
    if (serverKey) {
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
      const midtransResult = await createMidtransQrisCharge(
        {
          orderId: idempotencyKey,
          grossAmount: Number(amount),
        },
        serverKey,
        isProduction
      );

      if (midtransResult.success && midtransResult.qrUrl) {
        activeQrUrl = midtransResult.qrUrl;
        qrString = midtransResult.qrString || '';
        console.log(`[API create-qris] Dynamic QRIS successfully created via Midtrans (${isProduction ? 'PROD' : 'SANDBOX'}):`, idempotencyKey);
      } else {
        midtransDebug = {
          success: false,
          error: midtransResult.error,
          serverKeyPrefix: serverKey.substring(0, 10),
          isProduction,
        };
        console.warn('[API create-qris] Midtrans charge failed, falling back to mock:', midtransResult.error);
      }
    } else {
      midtransDebug = {
        serverKeyFound: false,
        envKeys: Object.keys(process.env).filter(k => k.includes('MIDTRANS')),
      };
    }



    // 1. Insert into master table: chair_slips
    const slipPayload = {
      chair_slip_number: idempotencyKey,
      chair_id: chairData ? String(chairData.id) : cleanChairId,
      chair_code: chairCode,
      location_id: locationId,
      customer_phone: customerPhone || 'GUEST',
      customer_email: customerEmail || '',
      amount: Number(amount),
      duration_in_minutes: Number(durationMinutes),
      pulse_count: Number(pulseCount),
      payment_method: 'QRIS',
      status: 'pending',
      qr_url: activeQrUrl,
      note: locationName,
      created_from: 'EDC_KIOSK',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdSlip, error: slipError } = await supabaseServer
      .from('chair_slips')
      .insert([slipPayload])
      .select()
      .maybeSingle();

    if (slipError) {
      console.warn('[API create-qris] chair_slips insert note:', slipError.message);
    }

    // 2. Insert into legacy transactions table for backward compatibility
    const transactionPayload = {
      idempotency_key: idempotencyKey,
      chair_id: chairCode,
      customer_phone: customerPhone || 'GUEST',
      customer_email: customerEmail || '',
      amount: Number(amount),
      duration_minutes: Number(durationMinutes),
      pulse_count: Number(pulseCount),
      payment_method: 'QRIS',
      status: 'PENDING',
      payment_gateway_ref: `REF-${Date.now()}`,
      qr_url: activeQrUrl,
    };

    const { data: createdTransaction } = await supabaseServer
      .from('transactions')
      .insert([transactionPayload])
      .select()
      .maybeSingle();

    const resultTransaction = createdSlip
      ? {
          id: createdSlip.id,
          idempotency_key: createdSlip.chair_slip_number,
          chair_id: createdSlip.chair_code || createdSlip.chair_id,
          customer_phone: createdSlip.customer_phone,
          amount: Number(createdSlip.amount),
          duration_minutes: createdSlip.duration_in_minutes,
          pulse_count: createdSlip.pulse_count,
          payment_method: createdSlip.payment_method,
          status: createdSlip.status,
          qr_url: createdSlip.qr_url,
          qr_string: qrString,
          created_at: createdSlip.created_at,
        }
      : createdTransaction || {
          id: crypto.randomUUID(),
          ...transactionPayload,
          qr_string: qrString,
          created_at: new Date().toISOString(),
        };

    console.log('[API create-qris] Saved transaction & slip to Supabase:', idempotencyKey);

    return NextResponse.json({
      success: true,
      transaction: resultTransaction,
      midtrans_debug: midtransDebug,
    });


  } catch (error: any) {
    console.error('[API create-qris] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
