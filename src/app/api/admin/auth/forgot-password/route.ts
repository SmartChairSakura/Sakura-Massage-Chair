import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    // Generate cryptographically random-like 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMs = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    const expiresIso = new Date(expiresMs).toISOString();

    // Store in-memory
    otpStore.set(cleanEmail, { otp: otpCode, expiresAt: expiresMs, attempts: 0 });

    // Persist OTP in Supabase admin_users for serverless / multi-container reliability
    try {
      await supabaseServer
        .from('admin_users')
        .update({
          otp_code: otpCode,
          otp_expires_at: expiresIso,
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail);
    } catch (dbErr) {
      console.warn('[Forgot Password] Supabase OTP persistence warning:', dbErr);
    }

    // Optional Nodemailer SMTP Email Dispatcher (Gmail SMTP)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"Sakura Zen Backoffice" <${smtpUser}>`,
          to: cleanEmail,
          subject: '[Sakura Zen] Admin Password Reset Verification Code',
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #fbf9f9; color: #1b1c1c;">
              <h2 style="color: #795465;">Sakura Zen Backoffice</h2>
              <p>Hello Admin,</p>
              <p>Use the following 6-digit verification code to reset the password for <strong>${cleanEmail}</strong>:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #795465; padding: 15px; background: #f8c8dc; display: inline-block; border-radius: 12px; margin: 15px 0;">
                ${otpCode}
              </div>
              <p style="font-size: 12px; color: #817478;">This code expires in 10 minutes. Do not share this code with anyone.</p>
            </div>
          `,
        });
        console.log(`[Forgot Password] Sent OTP via Gmail SMTP to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn('[Forgot Password] SMTP Send Error:', mailErr);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[Forgot Password Dev Mode] OTP for ${cleanEmail} is: ${otpCode}`);
    }

    // Security Hardened Response: Never leak OTP in HTTP JSON body
    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (err: any) {
    console.error('[API Forgot Password] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
