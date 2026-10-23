import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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

    // 1. Verify that email exists in admin_users
    const { data: dbUsers, error: userError } = await supabaseServer
      .from('admin_users')
      .select('id, email, full_name, is_active')
      .eq('email', cleanEmail)
      .limit(1);

    if (userError) {
      console.error('[Forgot Password] Supabase query error:', userError);
      return NextResponse.json({ success: false, error: 'Database service temporarily unavailable.' }, { status: 503 });
    }

    if (!dbUsers || dbUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No administrator account found with email: ${cleanEmail}. Please check the spelling or contact technical support.`,
      }, { status: 404 });
    }

    const adminUser = dbUsers[0];
    if (!adminUser.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Administrator account is suspended. Please contact system management.',
      }, { status: 403 });
    }

    // 2. Validate SMTP configuration
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.error('[Forgot Password] CRITICAL: SMTP_USER or SMTP_PASS is missing in environment variables!');
      return NextResponse.json({
        success: false,
        error: 'Email service is not configured on this server. Please ensure SMTP_USER and SMTP_PASS are set in Vercel Environment Variables (Preview & Production).',
      }, { status: 500 });
    }

    // 3. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMs = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    const expiresIso = new Date(expiresMs).toISOString();

    // 4. Send via Gmail SMTP with Port 465 SSL (Direct & Reliable on Serverless)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Sakura Zen Backoffice" <${smtpUser}>`,
        to: cleanEmail,
        subject: '[Sakura Zen] Admin Password Reset Verification Code',
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #fbf9f9; color: #1b1c1c; max-width: 500px; margin: 0 auto; border: 1px solid #efeded; border-radius: 16px;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #795465; margin: 0; font-size: 20px;">Sakura Zen Backoffice</h2>
              <span style="font-size: 11px; color: #817478; text-transform: uppercase; letter-spacing: 1px;">Security Verification</span>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #1b1c1c;">Hello <strong>${adminUser.full_name || 'Admin'}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #4f4448;">
              We received a request to reset the password for your Sakura Zen administrative account (<strong>${cleanEmail}</strong>).
            </p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #795465; padding: 18px 24px; background: #f8c8dc; display: inline-block; border-radius: 12px; margin: 20px 0; font-family: monospace;">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #817478; margin-bottom: 0;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email or notify security immediately.
            </p>
          </div>
        `,
      });
      console.log(`[Forgot Password] Successfully sent OTP to ${cleanEmail}`);
    } catch (mailErr: any) {
      console.error('[Forgot Password] SMTP Send Failed:', mailErr);
      return NextResponse.json({
        success: false,
        error: `Failed to dispatch email via Gmail SMTP: ${mailErr?.message || 'Connection error'}. Please check SMTP credentials.`,
      }, { status: 502 });
    }

    // 5. Only save OTP once email has successfully sent
    otpStore.set(cleanEmail, { otp: otpCode, expiresAt: expiresMs, attempts: 0 });

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

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
    });
  } catch (err: any) {
    console.error('[API Forgot Password] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
