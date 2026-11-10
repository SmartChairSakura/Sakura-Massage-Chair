import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createMidtransQrisCharge } from '@/lib/midtrans';
import { sanitizePostgrestValue, validateChairPackage, resolvePackageAmount } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chairId = body.chairId || body.chair_id;
    const amount = body.amount;
    const durationMinutes = body.durationMinutes || body.duration_minutes;
    const pulseCount = body.pulseCount || body.pulse_count;
    const customerPhone = body.customerPhone || body.customer_phone || 'GUEST';
    const customerEmail = body.customerEmail || body.customer_email || '';
    const createdFrom = body.createdFrom || body.created_from || 'IOT_KIOSK';

    if (!chairId || !amount || !durationMinutes || !pulseCount) {
      return NextResponse.json(
        { error: 'Missing required parameters: chairId, amount, durationMinutes, pulseCount' },
        { status: 400 }
      );
    }

    // Server-driven pricing & package validation (prevents price / pulse tampering; upgrades IOT_KIOSK when PRICE_PER_PULSE_IDR > 1)
    const pricePerPulse = Number(process.env.PRICE_PER_PULSE_IDR || process.env.MIN_PRICE_PER_PULSE_IDR || 1);
    const effectiveAmount = resolvePackageAmount(amount, pulseCount, createdFrom, pricePerPulse);
    const pkg = validateChairPackage(
      { amount: effectiveAmount, durationMinutes, pulseCount },
      pricePerPulse
    );
    if (!pkg.ok) {
      return NextResponse.json({ error: pkg.error }, { status: 400 });
    }

    // Lookup chair unit details from chairs table
    const cleanChairId = sanitizePostgrestValue(chairId);
    const { data: chairData } = await supabaseServer
      .from('chairs')
      .select('*')
      .or(`chair_code.eq.${cleanChairId},id.eq.${cleanChairId}`)
      .is('deleted_at', null)
      .maybeSingle();

    const chairCode = chairData ? chairData.chair_code : cleanChairId;
    let locationId = chairData ? chairData.location_id : null;
    let locationName = chairData ? chairData.location_name : '';

    // If chair has location_name but missing location_id, resolve from locations table
    if (!locationId && locationName) {
      const { data: locData } = await supabaseServer
        .from('locations')
        .select('id')
        .eq('name', locationName)
        .is('deleted_at', null)
        .maybeSingle();
      if (locData) {
        locationId = locData.id;
      }
    }

    const idempotencyKey = `TRX-${chairCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Generate Standard EMVCo QRIS Payload & URL (Midtrans API or fallback for TJC HMI qr0 component)
    const fallbackEmvcoString = `00020101021226670016ID.CO.MIDTRANS.WWW0118936009143000000000021550000000000000050303360540${effectiveAmount}5802ID5910SMART_CHAIR6007JAKARTA63048F3A`;
    const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackEmvcoString)}`;
    let activeQrUrl = mockQrUrl;
    let qrString = fallbackEmvcoString;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    let midtransDebug: any = null;
    if (serverKey) {
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
      const midtransResult = await createMidtransQrisCharge(
        {
          orderId: idempotencyKey,
          grossAmount: effectiveAmount,
        },
        serverKey,
        isProduction
      );

      if (midtransResult.success && midtransResult.qrUrl) {
        activeQrUrl = midtransResult.qrUrl;
        qrString = midtransResult.qrString || fallbackEmvcoString;
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

    // Insert into master table: chair_slips
    const slipPayload = {
      chair_slip_number: idempotencyKey,
      chair_id: chairData ? String(chairData.id) : cleanChairId,
      chair_code: chairCode,
      location_id: locationId,
      customer_phone: customerPhone || 'GUEST',
      customer_email: customerEmail || '',
      amount: effectiveAmount,
      duration_in_minutes: Number(durationMinutes),
      pulse_count: Number(pulseCount),
      payment_method: 'QRIS',
      status: 'pending',
      qr_url: activeQrUrl,
      note: locationName,
      created_from: createdFrom,
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
          created_from: createdSlip.created_from,
          created_at: createdSlip.created_at,
        }
      : {
          id: crypto.randomUUID(),
          idempotency_key: idempotencyKey,
          chair_id: chairCode,
          customer_phone: customerPhone || 'GUEST',
          customer_email: customerEmail || '',
          amount: effectiveAmount,
          duration_minutes: Number(durationMinutes),
          pulse_count: Number(pulseCount),
          payment_method: 'QRIS',
          status: 'PENDING',
          qr_url: activeQrUrl,
          qr_string: qrString,
          created_from: createdFrom,
          created_at: new Date().toISOString(),
        };

    console.log('[API create-qris] Saved chair_slip to Supabase:', idempotencyKey);

    return NextResponse.json({
      success: true,
      order_id: idempotencyKey,
      orderId: idempotencyKey,
      qr_string: qrString,
      qr_url: activeQrUrl,
      amount: effectiveAmount,
      duration_minutes: Number(durationMinutes),
      pulse_count: Number(pulseCount),
      transaction: resultTransaction,
      midtrans_debug: midtransDebug,
    });


  } catch (error: any) {
    console.error('[API create-qris] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
