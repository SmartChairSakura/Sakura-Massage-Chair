import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ success: false, error: 'Email admin wajib diisi.' }, { status: 400 });
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(cleanEmail, { otp: otpCode, expiresAt });

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
          subject: '[Sakura Zen] Kode Verifikasi Reset Password Admin',
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #fbf9f9; color: #1b1c1c;">
              <h2 style="color: #795465;">Sakura Zen Backoffice</h2>
              <p>Halo Admin,</p>
              <p>Gunakan Kode Verifikasi OTP berikut untuk mereset password akun <strong>${cleanEmail}</strong>:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #795465; padding: 15px; background: #f8c8dc; display: inline-block; border-radius: 12px; margin: 15px 0;">
                ${otpCode}
              </div>
              <p style="font-size: 12px; color: #817478;">Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.</p>
            </div>
          `,
        });
        console.log(`[Forgot Password] Sent OTP via Gmail SMTP to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn('[Forgot Password] SMTP Send Error:', mailErr);
      }
    } else {
      console.log(`[Forgot Password Mock] OTP for ${cleanEmail} is: ${otpCode}`);
    }

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi OTP 6-digit telah dikirim ke ${cleanEmail}.`,
      // Return OTP in dev mode if SMTP not configured so user can test seamlessly
      devOtp: !(smtpUser && smtpPass) ? otpCode : undefined,
    });
  } catch (err: any) {
    console.error('[API Forgot Password] Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
