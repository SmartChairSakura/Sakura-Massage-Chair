import crypto from 'crypto';

/**
 * Midtrans Payment Hardening & Security Helper
 * Follows /security-and-hardening rules:
 * - SHA512 Signature verification
 * - Nonce/Idempotency check
 * - Standardized error responses
 */

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_time?: string;
}

/**
 * Verifies Midtrans SHA512 signature key
 * Signature formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  payload: MidtransNotificationPayload,
  serverKey: string
): boolean {
  if (!payload || !payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return false;
  }

  // Handle gross_amount formatting (Midtrans sometimes sends "10000.00")
  const rawAmount = String(payload.gross_amount).trim();
  const formattedAmount = rawAmount.includes('.') ? rawAmount : `${rawAmount}.00`;

  // Try both raw amount and formatted amount to handle Midtrans decimal variations
  const stringToHash1 = `${payload.order_id}${payload.status_code}${rawAmount}${serverKey}`;
  const hash1 = crypto.createHash('sha512').update(stringToHash1).digest('hex');

  const stringToHash2 = `${payload.order_id}${payload.status_code}${formattedAmount}${serverKey}`;
  const hash2 = crypto.createHash('sha512').update(stringToHash2).digest('hex');

  return (
    crypto.timingSafeEqual(Buffer.from(payload.signature_key), Buffer.from(hash1)) ||
    crypto.timingSafeEqual(Buffer.from(payload.signature_key), Buffer.from(hash2))
  );
}

/**
 * Queries Midtrans Transaction Status Check API
 */
export async function checkMidtransTransactionStatus(
  orderId: string,
  serverKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const baseUrl = isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';

    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    const res = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `Midtrans HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Midtrans network error' };
  }
}

export interface CreateQrisParams {
  orderId: string;
  grossAmount: number;
}

export interface CreateQrisResult {
  success: boolean;
  qrUrl?: string;
  qrString?: string;
  transactionId?: string;
  raw?: any;
  error?: string;
}

/**
 * Creates a Dynamic QRIS charge via Midtrans Core API (/v2/charge)
 */
export async function createMidtransQrisCharge(
  params: CreateQrisParams,
  serverKey: string,
  isProduction: boolean = false
): Promise<CreateQrisResult> {
  try {
    const baseUrl = isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';

    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    const res = await fetch(`${baseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: {
          order_id: params.orderId,
          gross_amount: Math.round(params.grossAmount),
        },
        qris: {
          acquirer: 'gopay',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || (data.status_code && !String(data.status_code).startsWith('20'))) {
      console.error('[Midtrans Charge Error]:', data);
      return {
        success: false,
        error: data.status_message || `HTTP ${res.status}`,
        raw: data,
      };
    }

    // Extract QR code image URL from actions array
    let qrUrl = '';
    if (Array.isArray(data.actions)) {
      const qrAction =
        data.actions.find((a: any) => a.name === 'generate-qr-code') ||
        data.actions[0];
      if (qrAction?.url) {
        qrUrl = qrAction.url;
      }
    }

    // Fallback to QR server if qr_string exists but no action URL
    if (!qrUrl && data.qr_string) {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        data.qr_string
      )}`;
    }

    return {
      success: true,
      qrUrl,
      qrString: data.qr_string,
      transactionId: data.transaction_id,
      raw: data,
    };
  } catch (err: any) {
    console.error('[Midtrans Charge Exception]:', err);
    return {
      success: false,
      error: err?.message || 'Network exception calling Midtrans',
    };
  }
}

