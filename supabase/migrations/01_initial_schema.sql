-- Initial Schema Migration for Smart Kursi Pijat Sakura (Tokuyo Fleet Management)

-- 1. Master Chair Unit Table
CREATE TABLE IF NOT EXISTS chairs (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'SAKURA-GI-01', 'SAKURA-STG-01'
  name VARCHAR(100) NOT NULL,
  location_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) DEFAULT 'OFFLINE', -- 'ONLINE', 'OFFLINE', 'BUSY', 'MAINTENANCE'
  last_heartbeat TIMESTAMPTZ,
  firmware_version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Units (Production & Staging)
INSERT INTO chairs (id, name, location_name, status, is_active)
VALUES 
  ('SAKURA-GI-01', 'Sakura Series #01', 'Grand Indonesia Lt 3', 'ONLINE', true),
  ('SAKURA-STG-01', 'Sakura Staging Unit', 'Testing Environment', 'ONLINE', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, location_name = EXCLUDED.location_name;

-- 2. Transactions & Sessions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  chair_id VARCHAR(50) REFERENCES chairs(id),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  duration_minutes INT NOT NULL,
  pulse_count INT NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'QRIS',
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'ONGOING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'
  payment_gateway_ref VARCHAR(100),
  qr_url TEXT,
  session_start_at TIMESTAMPTZ,
  session_end_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_chair_id ON transactions(chair_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Enable Supabase Realtime Safely (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chairs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chairs;
  END IF;
END $$;
