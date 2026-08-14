-- Migration 05: Payment Hardening, Status Constraints & Chair Slip PARKEE 3-Tier Architecture
-- Project: Smart Kursi Pijat Sakura

-- 1. Main Session Table (Chair Slips)
CREATE TABLE IF NOT EXISTS chair_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chair_slip_number VARCHAR(100) UNIQUE NOT NULL,
  chair_id VARCHAR(100) REFERENCES chairs(id) ON DELETE RESTRICT,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  duration_in_minutes INT NOT NULL,
  pulse_count INT NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'QRIS_MIDTRANS',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  qr_url TEXT,
  session_start_at TIMESTAMPTZ,
  session_end_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure idempotency key / slip number is unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_chair_slip_number'
  ) THEN
    ALTER TABLE chair_slips ADD CONSTRAINT unique_chair_slip_number UNIQUE (chair_slip_number);
  END IF;
END $$;

-- Status State Machine Constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_chair_slip_status'
  ) THEN
    ALTER TABLE chair_slips DROP CONSTRAINT valid_chair_slip_status;
  END IF;
  
  ALTER TABLE chair_slips ADD CONSTRAINT valid_chair_slip_status CHECK (
    status IN (
      'pending', 'paid', 'paid_pending_delivery', 
      'session_inprocess', 'done', 'expired', 
      'failed', 'cancelled', 'expired_paid'
    )
  );
END $$;

-- Index for Cron Reconciliation Job
CREATE INDEX IF NOT EXISTS idx_chair_slips_pending_reconcile
  ON chair_slips (status, created_at)
  WHERE status = 'pending';

-- 2. Detailed Payment Gateway Transactions Table (Chair Slip Payments)
CREATE TABLE IF NOT EXISTS chair_slip_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chair_slip_id UUID REFERENCES chair_slips(id) ON DELETE CASCADE,
  pg_ref_number VARCHAR(100) NOT NULL, -- Midtrans Order ID / Payment Ref
  edc_ref_number VARCHAR(100),         -- EDC Terminal Serial / Ref Number
  amount NUMERIC(12,2) NOT NULL,
  sub_amount NUMERIC(12,2) NOT NULL,
  mdr_fee NUMERIC(12,2) DEFAULT 0,      -- 0.7% QRIS Fee
  dev_share NUMERIC(12,2) DEFAULT 0,    -- 5% Dev Share
  owner_net NUMERIC(12,2) DEFAULT 0,    -- 94.3% Net Owner
  payment_method VARCHAR(50) DEFAULT 'QRIS_MIDTRANS',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Read-Optimized Summary & Audit Log Table (Chair Slip Summary Detail)
CREATE TABLE IF NOT EXISTS chair_slip_summary_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chair_slip_id UUID REFERENCES chair_slips(id) ON DELETE CASCADE,
  chair_slip_payment_id UUID REFERENCES chair_slip_payments(id) ON DELETE SET NULL,
  chair_id VARCHAR(100),
  chair_name VARCHAR(100),
  location_name VARCHAR(150),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(50) NOT NULL, -- 'webhook', 'cron', 'edc_ack', 'admin', 'system'
  amount NUMERIC(12,2),
  mdr_fee NUMERIC(12,2),
  dev_share NUMERIC(12,2),
  owner_net NUMERIC(12,2),
  duration_in_minutes INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Automatic Trigger for Status Log in chair_slip_summary_detail
CREATE OR REPLACE FUNCTION log_chair_slip_summary_detail_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO chair_slip_summary_detail (
      chair_slip_id, 
      chair_id,
      old_status, 
      new_status, 
      changed_by, 
      amount,
      duration_in_minutes,
      metadata
    )
    VALUES (
      NEW.id, 
      NEW.chair_id,
      OLD.status, 
      NEW.status, 
      'system',
      NEW.amount,
      NEW.duration_in_minutes,
      jsonb_build_object('updated_at', NEW.updated_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chair_slip_summary_detail ON chair_slips;
CREATE TRIGGER trg_chair_slip_summary_detail
AFTER UPDATE ON chair_slips
FOR EACH ROW
EXECUTE FUNCTION log_chair_slip_summary_detail_change();
