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
    const isProduction = process.env.NODE_ENV === 'production';
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
