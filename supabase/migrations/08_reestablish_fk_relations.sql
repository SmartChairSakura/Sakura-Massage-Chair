-- Migration 08: Re-establish Foreign Key Relations Between chairs & chair_slips
-- Project: Smart Kursi Pijat Sakura
-- ⚠️ JALANKAN SETELAH Migration 07

-- 1. Pastikan kolom chair_code ada di semua tabel relasi
ALTER TABLE chair_slips ADD COLUMN IF NOT EXISTS chair_code VARCHAR(50);
ALTER TABLE chair_slip_summary_detail ADD COLUMN IF NOT EXISTS chair_code VARCHAR(50);

-- 2. Populate chair_code di chair_slips dari chair_id lama (backward compat)
UPDATE chair_slips SET chair_code = chair_id WHERE chair_code IS NULL AND chair_id IS NOT NULL;

-- 3. Buat Foreign Key: chair_slips.chair_code → chairs.chair_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chair_slips_chair_code'
  ) THEN
    ALTER TABLE chair_slips
      ADD CONSTRAINT fk_chair_slips_chair_code
      FOREIGN KEY (chair_code) REFERENCES chairs(chair_code)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. Buat Foreign Key: chair_slip_summary_detail.chair_code → chairs.chair_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chair_slip_summary_detail_chair_code'
  ) THEN
    ALTER TABLE chair_slip_summary_detail
      ADD CONSTRAINT fk_chair_slip_summary_detail_chair_code
      FOREIGN KEY (chair_code) REFERENCES chairs(chair_code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Index pada chair_code di chair_slips untuk performa JOIN
CREATE INDEX IF NOT EXISTS idx_chair_slips_chair_code ON chair_slips (chair_code);
CREATE INDEX IF NOT EXISTS idx_chair_slip_summary_chair_code ON chair_slip_summary_detail (chair_code);

-- 6. Verifikasi: Cek data chairs
SELECT id, chair_code, name, model_type, location_name, status FROM chairs ORDER BY id;
