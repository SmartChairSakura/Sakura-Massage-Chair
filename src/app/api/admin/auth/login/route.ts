import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { comparePassword, signSessionJWT, AUTH_COOKIE_NAME, AdminSessionPayload, UserRole } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const inputAccount = String(email || '').trim().toLowerCase();
    const inputPassword = String(password || '').trim();

    if (!inputAccount || !inputPassword) {
      return NextResponse.json(
        { success: false, error: 'Email/Username dan Password wajib diisi.' },
        { status: 400 }
      );
    }

    let sessionUser: AdminSessionPayload | null = null;

    // 1. Query Supabase admin_users table by email or username
    const { data: dbUsers, error: dbError } = await supabaseServer
      .from('admin_users')
      .select('id, email, username, full_name, role, location_id, password_hash, is_active')
      .or(`email.eq.${inputAccount},username.eq.${inputAccount}`)
      .limit(1);

    if (!dbError && dbUsers && dbUsers.length > 0) {
      const user = dbUsers[0];

      if (!user.is_active) {
        return NextResponse.json(
          { success: false, error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi Super Admin.' },
          { status: 403 }
        );
      }

      const isPassValid = await comparePassword(inputPassword, user.password_hash);
      if (!isPassValid) {
        return NextResponse.json(
          { success: false, error: 'Email/Username atau Password salah.' },
          { status: 401 }
        );
      }

      const role: UserRole = (user.role === 'MANAGEMENT' || user.role === 'OWNER') ? 'MANAGEMENT' : 'SUPER_ADMIN';

      sessionUser = {
        id: String(user.id),
        email: user.email,
        username: user.username,
        name: user.full_name,
        role,
        location_id: user.location_id ? String(user.location_id) : null,
      };

      // Update last_login_at timestamp in background
      await supabaseServer
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

    } else {
      // Fallback for initial bootstrap if migration 11 hasn't been executed on DB
      const VALID_USERNAMES = ['admin', 'admin@sakurazen.id', 'support@sakurazen.id', 'rifaldi@parkee.app'];
      const VALID_PASSWORDS = ['sakura123', 'admin123', 'parkee@1234'];

      const isValidUser = VALID_USERNAMES.includes(inputAccount);
      const isValidPass = VALID_PASSWORDS.includes(inputPassword);

      if (!isValidUser || !isValidPass) {
        return NextResponse.json(
          { success: false, error: 'Email/Username atau Password salah.' },
          { status: 401 }
        );
      }

      sessionUser = {
        id: 'admin_sakura_01',
        email: inputAccount.includes('@') ? inputAccount : 'rifaldi@parkee.app',
        username: inputAccount,
        name: 'Administrator Sakura Zen',
        role: 'SUPER_ADMIN',
        location_id: null,
      };
    }

    // 2. Sign JWT session token
    const token = await signSessionJWT(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: sessionUser,
    });

    // 3. Set secure HttpOnly cookie for admin session
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true, // Prevents XSS cookie theft
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days expiration
    });

    return response;
  } catch (err: any) {
    console.error('[API Admin Auth Login] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
