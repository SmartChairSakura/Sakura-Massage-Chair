import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otpCode, newPassword } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otpCode || '').trim();
    const cleanPass = String(newPassword || '').trim();

    if (!cleanEmail || !cleanOtp || !cleanPass) {
      return NextResponse.json({ success: false, error: 'Email, Kode OTP, dan Password Baru wajib diisi.' }, { status: 400 });
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ success: false, error: 'Password Baru minimal 6 karakter.' }, { status: 400 });
    }

    const storedData = otpStore.get(cleanEmail);

    if (!storedData) {
      return NextResponse.json({ success: false, error: 'Kode OTP tidak ditemukan atau belum dibuat.' }, { status: 400 });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(cleanEmail);
      return NextResponse.json({ success: false, error: 'Kode OTP sudah kadaluarsa (lebih dari 10 menit). Silakan minta kode baru.' }, { status: 400 });
    }

    if (storedData.otp !== cleanOtp) {
      return NextResponse.json({ success: false, error: 'Kode OTP Verifikasi Salah.' }, { status: 401 });
    }

    // Success! Clear OTP store
    otpStore.delete(cleanEmail);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil di-reset! Silakan login menggunakan password baru Anda.',
    });
  } catch (err: any) {
    console.error('[API Reset Password] Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
