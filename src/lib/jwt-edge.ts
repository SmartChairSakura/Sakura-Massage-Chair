import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'SUPER_ADMIN' | 'OWNER';

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
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'sakura_zen_backoffice_jwt_secret_key_2026_production_secure_795465';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Generates cryptographically signed HMAC-SHA256 JWT session token (Edge compatible).
 */
export async function signSessionJWT(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET_KEY);
}

/**
 * Verifies JWT session token and returns decoded payload (Edge compatible).
 */
export async function verifySessionJWT(token: string): Promise<AdminSessionPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    
    return {
      id: String(payload.id || ''),
      email: String(payload.email || ''),
      username: String(payload.username || ''),
      name: String(payload.name || ''),
      role: (payload.role as UserRole) || 'SUPER_ADMIN',
      location_id: payload.location_id ? String(payload.location_id) : null,
    };
  } catch (err) {
    return null;
  }
}
