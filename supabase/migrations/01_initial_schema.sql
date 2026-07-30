-- Initial Schema Migration for Smart Kursi Pijat Tokuyo Fleet Management

-- 1. Master Chair Unit Table
CREATE TABLE IF NOT EXISTS chairs (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'TOK-GI-01'
  name VARCHAR(100) NOT NULL,
  location_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) DEFAULT 'OFFLINE', -- 'ONLINE', 'OFFLINE', 'BUSY', 'MAINTENANCE'
  last_heartbeat TIMESTAMPTZ,
  firmware_version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Pilot Unit
INSERT INTO chairs (id, name, location_name, status, is_active)
VALUES ('TOK-GI-01', 'Tokuyo Deluxe #01', 'Grand Indonesia Lt 3', 'ONLINE', true)
ON CONFLICT (id) DO NOTHING;

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
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'ONGOING', 'COMPLETED', 'FAILED', 'EXPIRED'
  payment_gateway_ref VARCHAR(100),
  qr_url TEXT,
  session_start_at TIMESTAMPTZ,
  session_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime for Tables
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chairs;
