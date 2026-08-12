-- Migration 04: Add pin column, configure RLS write policies, and seed all initial chair units into Supabase PostgreSQL DB

-- 1. Add missing 'pin' column to chairs table
ALTER TABLE chairs 
ADD COLUMN IF NOT EXISTS pin VARCHAR(20) DEFAULT '123456';

-- 2. Configure Row Level Security (RLS) Policies for chairs table to allow API writes
DROP POLICY IF EXISTS "Allow anon select active chairs" ON chairs;
DROP POLICY IF EXISTS "Allow anon select all chairs" ON chairs;
CREATE POLICY "Allow anon select all chairs"
  ON chairs FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert and update chairs" ON chairs;
CREATE POLICY "Allow anon insert and update chairs"
  ON chairs FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed / Upsert all initial units into PostgreSQL chairs table
INSERT INTO chairs (id, name, location_name, status, is_active, pin)
VALUES 
  ('SAKURA-GI-01', 'Sakura Series #01', 'Grand Indonesia Lt 3', 'ONLINE', true, '123456'),
  ('SAKURA-CP-01', 'Sakura Series #02', 'Central Park Fl 1', 'ONLINE', true, '123456'),
  ('SAKURA-MOI-01', 'Sakura Series #03', 'Mall of Indonesia Lt 2', 'ONLINE', true, '123456'),
  ('SAKURA-PIK-01', 'Sakura Series #04 - PIK', 'Pantai Indah Kapuk', 'ONLINE', true, '123456'),
  ('SAKURA-LVB-01', 'Stagging Unit', 'Living Mall Bekasi', 'ONLINE', true, '123456'),
  ('SAKURA-STG-01', 'Sakura Staging Unit', 'Testing Environment', 'ONLINE', true, '123456')
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name, 
  location_name = EXCLUDED.location_name,
  pin = EXCLUDED.pin,
  is_active = true;
