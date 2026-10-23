// Global in-memory OTP store for reset password verification
export interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts?: number;
}

export const otpStore = new Map<string, OtpRecord>();

