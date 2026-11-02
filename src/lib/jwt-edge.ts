import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'SUPER_ADMIN' | 'MANAGEMENT' | 'OWNER';

export interface AdminSessionPayload {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  location_id: string | null;
}

export const AUTH_COOKIE_NAME = 'sakura_admin_session';

// Secret key for signing JWT tokens in Edge environment
// TODO(post-demo): remove the literal fallback once JWT_SECRET is set in Vercel.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] JWT_SECRET is not set in production; using insecure fallback secret. Set JWT_SECRET in Vercel env.');
}
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'sakura_zen_backoffice_jwt_secret_key_2026_production_secure_795465';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

const VALID_ROLES: UserRole[] = ['SUPER_ADMIN', 'MANAGEMENT', 'OWNER'];

/**
 * Generates cryptographically signed HMAC-SHA256 JWT session token (Edge compatible).
 */
export async function signSessionJWT(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET_KEY);
}

/**
 * Verifies JWT session token and returns decoded payload (Edge compatible).
 */
export async function verifySessionJWT(token: string): Promise<AdminSessionPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);

    // Never default a missing/unknown role to SUPER_ADMIN
    const role = payload.role as UserRole;
    if (!VALID_ROLES.includes(role)) return null;
    
    return {
      id: String(payload.id || ''),
      email: String(payload.email || ''),
      username: String(payload.username || ''),
      name: String(payload.name || ''),
      role,
      location_id: payload.location_id ? String(payload.location_id) : null,
    };
  } catch (err) {
    return null;
  }
}
