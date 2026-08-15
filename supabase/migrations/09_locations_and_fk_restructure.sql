-- Migration 09: Locations Entity, Foreign Keys Restructure & Reporting Indexes
-- Project: Smart Kursi Pijat Sakura
-- ⚠️ JALANKAN DI SUPABASE SQL EDITOR

-- =========================================================================
-- 1. CREATE TABLE locations
-- =========================================================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code VARCHAR(50) UNIQUE NOT NULL,     -- e.g. "CP-01", "GI-01", "PIK-01"
  name VARCHAR(255) NOT NULL,                     -- e.g. "Central Park Fl 1"
  address TEXT,
  city VARCHAR(100) DEFAULT 'Jakarta',
  pic_name VARCHAR(255) DEFAULT 'Operational Team',
  pic_phone VARCHAR(50) DEFAULT '08123456789',
  owner_share_pct NUMERIC(5,2) NOT NULL DEFAULT 95.00,
  system_share_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active',   -- 'active' | 'inactive'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT valid_share_split CHECK (owner_share_pct + system_share_pct = 100.00)
);

CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code) WHERE deleted_at IS NULL;

-- RLS Policies for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon select all locations" ON locations;
CREATE POLICY "Allow anon select all locations" ON locations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon manage locations" ON locations;
CREATE POLICY "Allow anon manage locations" ON locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 2. ADD LOCATION_ID FK TO EXISTING TABLES
-- =========================================================================
ALTER TABLE chairs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_chairs_location ON chairs(location_id) WHERE deleted_at IS NULL;

ALTER TABLE chair_slips ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_chair_slips_location_created ON chair_slips(location_id, created_at DESC);

ALTER TABLE chair_slip_summary_detail ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_summary_location_created ON chair_slip_summary_detail(location_id, created_at DESC);

-- Additional reporting performance indexes
CREATE INDEX IF NOT EXISTS idx_chair_slips_status_created ON chair_slips(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chair_slips_pending_created ON chair_slips(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_chair_slips_payment_method ON chair_slips(payment_method);

-- =========================================================================
-- 3. DATA MIGRATION SCRIPT FOR EXISTING CHAIRS & SLIPS
-- =========================================================================
-- Step 1: Insert distinct location_name from chairs table into locations
INSERT INTO locations (location_code, name, status)
SELECT
  UPPER(LEFT(REGEXP_REPLACE(location_name, '[^a-zA-Z]', '', 'g'), 4)) || '-01' AS location_code,
  location_name,
  'active'
FROM (
  SELECT DISTINCT location_name
  FROM chairs
  WHERE deleted_at IS NULL AND location_name IS NOT NULL AND location_name != ''
) AS distinct_locations
ON CONFLICT (location_code) DO UPDATE SET name = EXCLUDED.name;

-- Step 2: Populate chairs.location_id by matching location_name
UPDATE chairs c
SET location_id = l.id
FROM locations l
WHERE (c.location_name = l.name OR c.location_name ILIKE '%' || l.name || '%')
  AND c.location_id IS NULL;

-- Step 3: Populate chair_slips.location_id via join to chairs
UPDATE chair_slips cs
SET location_id = c.location_id
FROM chairs c
WHERE (cs.chair_id::text = c.id::text OR cs.chair_code = c.chair_code)
  AND cs.location_id IS NULL AND c.location_id IS NOT NULL;

-- Step 4: Populate chair_slip_summary_detail.location_id via join to chairs
UPDATE chair_slip_summary_detail csd
SET location_id = c.location_id
FROM chairs c
WHERE (csd.chair_code = c.chair_code OR csd.chair_id::text = c.id::text)
  AND csd.location_id IS NULL AND c.location_id IS NOT NULL;

-- Verification queries (Run in SQL Editor to confirm zero orphan chairs)
-- SELECT id, chair_code, name, location_name, location_id FROM chairs WHERE deleted_at IS NULL;
-- SELECT id, location_code, name, owner_share_pct, system_share_pct FROM locations WHERE deleted_at IS NULL;
