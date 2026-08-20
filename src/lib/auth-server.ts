import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifySessionJWT, AUTH_COOKIE_NAME, AdminSessionPayload } from './jwt-edge';

export * from './jwt-edge';

/**
 * Hashes plain text password using bcrypt with salt rounds = 10.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plain text password against bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Extracts and verifies active session from request cookies or Next.js headers cookies.
 */
export async function getAdminSession(req?: NextRequest): Promise<AdminSessionPayload | null> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }

    if (!token) return null;
    return await verifySessionJWT(token);
  } catch (err) {
    return null;
  }
}
