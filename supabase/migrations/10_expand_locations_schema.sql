-- Migration 10: Expand Locations Schema with Address Metadata & Dynamic Income Breakdown JSONB
-- Project: Smart Kursi Pijat Sakura
-- ⚠️ JALANKAN DI SUPABASE SQL EDITOR

-- 1. Add standard location metadata columns
ALTER TABLE locations ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Indonesia';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state_province VARCHAR(100) DEFAULT 'DKI Jakarta';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- 2. Add income_breakdown JSONB column for multi-party revenue splits
ALTER TABLE locations ADD COLUMN IF NOT EXISTS income_breakdown JSONB DEFAULT '[
  {"entity": "LANDOWNER", "party_name": "Pemilik Lahan / Partner", "percentage": 95, "is_default": true},
  {"entity": "SYSTEM", "party_name": "Sistem & Operasional", "percentage": 5, "is_default": false}
]'::jsonb;

-- 3. Update existing locations with default income breakdown if NULL
UPDATE locations
SET income_breakdown = jsonb_build_array(
  jsonb_build_object('entity', 'LANDOWNER', 'party_name', 'Pemilik Lahan ' || name, 'percentage', COALESCE(owner_share_pct, 95.0), 'is_default', true),
  jsonb_build_object('entity', 'SYSTEM', 'party_name', 'Sistem & Operasional', 'percentage', COALESCE(system_share_pct, 5.0), 'is_default', false)
)
WHERE income_breakdown IS NULL;
