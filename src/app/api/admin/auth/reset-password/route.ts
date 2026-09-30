import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';
import { supabaseServer } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otpCode, newPassword } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otpCode || '').trim();
    const cleanPass = String(newPassword || '').trim();

    if (!cleanEmail || !cleanOtp || !cleanPass) {
      return NextResponse.json({ success: false, error: 'Email, verification code, and new password are required.' }, { status: 400 });
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const storedData = otpStore.get(cleanEmail);

    if (!storedData) {
      return NextResponse.json({ success: false, error: 'Verification code not found or expired.' }, { status: 400 });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(cleanEmail);
      return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    if (storedData.otp !== cleanOtp) {
      return NextResponse.json({ success: false, error: 'Invalid verification code.' }, { status: 401 });
    }

    // Hash the new password with bcrypt
    const hashedPassword = await hashPassword(cleanPass);

    // Update password_hash in Supabase admin_users table
    const { error: dbError } = await supabaseServer
      .from('admin_users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    if (dbError) {
      console.warn('[Reset Password] Supabase update warning:', dbError.message);
    }

    // Clear OTP store
    otpStore.delete(cleanEmail);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  } catch (err: any) {
    console.error('[API Reset Password] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
