// Global in-memory OTP store for reset password verification
export const otpStore = new Map<string, { otp: string; expiresAt: number }>();
