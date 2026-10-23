import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';
import { supabaseServer } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/auth-server';

const MAX_OTP_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otpCode, newPassword } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otpCode || '').trim();
    const cleanPass = String(newPassword || '').trim();

    if (!cleanEmail || !cleanOtp || !cleanPass) {
      return NextResponse.json(
        { success: false, error: 'Email, verification code, and new password are required.' },
        { status: 400 }
      );
    }

    if (cleanPass.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Check rate limit / brute-force attempts from memory store
    const memData = otpStore.get(cleanEmail);
    const currentAttempts = (memData?.attempts || 0) + 1;

    if (memData && memData.attempts && memData.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(cleanEmail);
      // Invalidate Supabase OTP as well on lockout
      await supabaseServer
        .from('admin_users')
        .update({ otp_code: null, otp_expires_at: null, updated_at: new Date().toISOString() })
        .eq('email', cleanEmail);

      return NextResponse.json(
        { success: false, error: 'Too many failed verification attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Lookup OTP from Supabase admin_users (Primary) and otpStore (Fallback)
    const { data: dbUsers } = await supabaseServer
      .from('admin_users')
      .select('id, email, otp_code, otp_expires_at')
      .eq('email', cleanEmail)
      .limit(1);

    const dbUser = dbUsers && dbUsers.length > 0 ? dbUsers[0] : null;

    let expectedOtp: string | null = null;
    let isExpired = false;

    if (dbUser && dbUser.otp_code) {
      expectedOtp = dbUser.otp_code;
      if (dbUser.otp_expires_at && new Date(dbUser.otp_expires_at).getTime() < Date.now()) {
        isExpired = true;
      }
    } else if (memData) {
      expectedOtp = memData.otp;
      if (Date.now() > memData.expiresAt) {
        isExpired = true;
      }
    }

    if (!expectedOtp) {
      return NextResponse.json(
        { success: false, error: 'Verification code not found or expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (isExpired) {
      otpStore.delete(cleanEmail);
      await supabaseServer
        .from('admin_users')
        .update({ otp_code: null, otp_expires_at: null })
        .eq('email', cleanEmail);

      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP match
    if (expectedOtp !== cleanOtp) {
      if (memData) {
        memData.attempts = currentAttempts;
        otpStore.set(cleanEmail, memData);
      } else {
        otpStore.set(cleanEmail, {
          otp: expectedOtp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          attempts: currentAttempts,
        });
      }

      const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - currentAttempts);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        },
        { status: 401 }
      );
    }

    // OTP is valid - Hash the new password with bcrypt
    const hashedPassword = await hashPassword(cleanPass);

    // Update password_hash and clear OTP in Supabase admin_users
    const { error: dbError } = await supabaseServer
      .from('admin_users')
      .update({
        password_hash: hashedPassword,
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    if (dbError) {
      console.error('[Reset Password] Supabase update error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to update credentials. Please try again.' },
        { status: 500 }
      );
    }

    // Clear memory OTP store
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
