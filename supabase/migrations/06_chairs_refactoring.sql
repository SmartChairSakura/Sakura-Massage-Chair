-- Migration 06: Refactor Chairs Table - Add chair_code & model_type Columns
-- Project: Smart Kursi Pijat Sakura

-- 1. Add chair_code & model_type columns to chairs table if not exist
ALTER TABLE chairs ADD COLUMN IF NOT EXISTS chair_code VARCHAR(50);
ALTER TABLE chairs ADD COLUMN IF NOT EXISTS model_type VARCHAR(100) DEFAULT 'Tokuyo TC-355';

-- 2. Populate chair_code with existing id string for backwards compatibility
UPDATE chairs SET chair_code = id WHERE chair_code IS NULL;
UPDATE chairs SET model_type = 'Tokuyo TC-355' WHERE model_type IS NULL;

-- 3. Add UNIQUE constraint to chair_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_chairs_chair_code'
  ) THEN
    ALTER TABLE chairs ADD CONSTRAINT unique_chairs_chair_code UNIQUE (chair_code);
  END IF;
END $$;

-- 4. Add chair_code to chair_slips for denormalized fast reads
ALTER TABLE chair_slips ADD COLUMN IF NOT EXISTS chair_code VARCHAR(50);
ALTER TABLE chair_slip_summary_detail ADD COLUMN IF NOT EXISTS chair_code VARCHAR(50);
ALTER TABLE chair_slip_summary_detail ADD COLUMN IF NOT EXISTS model_type VARCHAR(100);
