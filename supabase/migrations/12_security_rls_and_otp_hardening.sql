-- ============================================================================
-- Migration 12: Security RLS Lockdown & Persistent OTP Brute-Force Counter
-- Sakura Zen Backoffice & IoT Security Hardening
-- Verified against live Supabase schema:
--   admin_users, chairs, locations, chair_slips,
--   chair_slip_payments, chair_slip_summary_detail, chair_slip_settlements
-- ============================================================================

-- 1. Add persistent OTP attempt counter to admin_users (survives serverless cold starts)
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS otp_attempts INT NOT NULL DEFAULT 0;

-- 2. Lock down public.admin_users exclusively to service_role
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for authentication API" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated service management" ON public.admin_users;
DROP POLICY IF EXISTS "Service role full access on admin_users" ON public.admin_users;

CREATE POLICY "Service role full access on admin_users"
  ON public.admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Lock down write access on public.chairs (keep anon SELECT for kiosk UI)
ALTER TABLE public.chairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert and update chairs" ON public.chairs;
DROP POLICY IF EXISTS "Allow anon select active chairs" ON public.chairs;
DROP POLICY IF EXISTS "Allow anon select all chairs" ON public.chairs;
DROP POLICY IF EXISTS "Allow service_role full access on chairs" ON public.chairs;

CREATE POLICY "Allow anon select all chairs"
  ON public.chairs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service_role full access on chairs"
  ON public.chairs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Lock down write access on public.locations (keep anon SELECT)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage locations" ON public.locations;
DROP POLICY IF EXISTS "Allow anon select all locations" ON public.locations;
DROP POLICY IF EXISTS "Allow service_role full access on locations" ON public.locations;

CREATE POLICY "Allow anon select all locations"
  ON public.locations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service_role full access on locations"
  ON public.locations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Enable RLS on chair_slips (anon SELECT for Web Kiosk Realtime; service_role full access)
ALTER TABLE public.chair_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select chair_slips" ON public.chair_slips;
DROP POLICY IF EXISTS "Allow service_role full access on chair_slips" ON public.chair_slips;

CREATE POLICY "Allow anon select chair_slips"
  ON public.chair_slips
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service_role full access on chair_slips"
  ON public.chair_slips
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Lock down financial & summary tables exclusively to service_role
ALTER TABLE public.chair_slip_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access on chair_slip_payments" ON public.chair_slip_payments;

CREATE POLICY "Allow service_role full access on chair_slip_payments"
  ON public.chair_slip_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.chair_slip_summary_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access on chair_slip_summary_detail" ON public.chair_slip_summary_detail;

CREATE POLICY "Allow service_role full access on chair_slip_summary_detail"
  ON public.chair_slip_summary_detail
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.chair_slip_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access on chair_slip_settlements" ON public.chair_slip_settlements;

CREATE POLICY "Allow service_role full access on chair_slip_settlements"
  ON public.chair_slip_settlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
