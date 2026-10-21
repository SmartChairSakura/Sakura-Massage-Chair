import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// Normalized statuses that indicate a successfully paid session ready for pulse triggering
const PAID_STATUSES = new Set([
  'paid',
  'paid_pending_delivery',
  'session_inprocess',
  'done',
  'PAID',
  'ONGOING',
  'COMPLETED',
]);

const FAILED_STATUSES = new Set([
  'expired',
  'failed',
  'cancelled',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
]);

/**
 * GET: Lightweight Status Polling Endpoint for ESP32 Microcontrollers & IoT Kiosks
 * Query params: ?orderId=TRX-... (or ?order_id=TRX-...)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId') || searchParams.get('order_id');

    if (!orderId || !orderId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: orderId' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanOrderId = orderId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanOrderId);

    // 1. Query master table: chair_slips
    let slipQuery = supabaseServer
      .from('chair_slips')
      .select('id, chair_slip_number, chair_id, chair_code, amount, duration_in_minutes, pulse_count, status, qr_url, created_at');

    if (isUuid) {
      slipQuery = slipQuery.or(`chair_slip_number.eq.${cleanOrderId},id.eq.${cleanOrderId}`);
    } else {
      slipQuery = slipQuery.eq('chair_slip_number', cleanOrderId);
    }

    const { data: slip, error: slipError } = await slipQuery.maybeSingle();

    if (slip) {
      const rawStatus = String(slip.status || '').toLowerCase();
      const isPaid = PAID_STATUSES.has(slip.status) || PAID_STATUSES.has(rawStatus);
      const isFailed = FAILED_STATUSES.has(slip.status) || FAILED_STATUSES.has(rawStatus);

      let normalizedStatus = 'pending';
      if (isPaid) {
        normalizedStatus = 'paid';
      } else if (isFailed) {
        normalizedStatus = 'failed';
      }

      return NextResponse.json(
        {
          success: true,
          order_id: slip.chair_slip_number || cleanOrderId,
          status: normalizedStatus,
          is_paid: isPaid,
          pulse_count: Number(slip.pulse_count || 5),
          duration_minutes: Number(slip.duration_in_minutes || 4),
          amount: Number(slip.amount || 5000),
          chair_id: slip.chair_code || slip.chair_id,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fallback query to legacy transactions table
    let txQuery = supabaseServer
      .from('transactions')
      .select('id, idempotency_key, chair_id, amount, duration_minutes, pulse_count, status, qr_url');

    if (isUuid) {
      txQuery = txQuery.or(`idempotency_key.eq.${cleanOrderId},id.eq.${cleanOrderId}`);
    } else {
      txQuery = txQuery.eq('idempotency_key', cleanOrderId);
    }

    const { data: tx, error: txError } = await txQuery.maybeSingle();

    if (tx) {
      const rawStatus = String(tx.status || '').toLowerCase();
      const isPaid = PAID_STATUSES.has(tx.status) || PAID_STATUSES.has(rawStatus);
      const isFailed = FAILED_STATUSES.has(tx.status) || FAILED_STATUSES.has(rawStatus);

      let normalizedStatus = 'pending';
      if (isPaid) {
        normalizedStatus = 'paid';
      } else if (isFailed) {
        normalizedStatus = 'failed';
      }

      return NextResponse.json(
        {
          success: true,
          order_id: tx.idempotency_key || cleanOrderId,
          status: normalizedStatus,
          is_paid: isPaid,
          pulse_count: Number(tx.pulse_count || 5),
          duration_minutes: Number(tx.duration_minutes || 4),
          amount: Number(tx.amount || 5000),
          chair_id: tx.chair_id,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Not found in either table
    return NextResponse.json(
      {
        success: false,
        error: 'Order not found',
        order_id: cleanOrderId,
        status: 'not_found',
        is_paid: false,
      },
      { status: 404, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[API payments/status GET] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
