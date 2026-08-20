-- ==========================================
-- Migration 11: Admin Users Schema & Seed
-- Sakura Zen Backoffice Authentication & RBAC
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'OWNER')),
    location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup during auth & sessions
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_location_id ON public.admin_users(location_id);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Clean policy definitions for idempotency
DROP POLICY IF EXISTS "Allow public read for authentication API" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated service management" ON public.admin_users;

-- Allow service role and public API read
CREATE POLICY "Allow public read for authentication API" 
ON public.admin_users FOR SELECT USING (true);

CREATE POLICY "Allow authenticated service management" 
ON public.admin_users FOR ALL USING (true);

-- Seed initial admin users with valid bcrypt password hashes
-- Default accounts:
-- 1. rifaldi@parkee.app / parkee@1234 (SUPER_ADMIN)
-- 2. admin@sakurazen.id / sakura123 (SUPER_ADMIN)
-- 3. owner@sakurazen.id / owner123 (OWNER - Mall of Indonesia)

INSERT INTO public.admin_users (
    email, 
    username, 
    phone_number, 
    password_hash, 
    full_name, 
    role, 
    location_id, 
    is_active
) VALUES 
(
    'rifaldi@parkee.app',
    'rifaldi',
    '081234567890',
    '$2b$10$JLwP127dHc7hgg4VQmKfheiRyuPZKrB5EfPL9SEw5svZkLVTncNay', -- parkee@1234
    'Rifaldi (PARKEE HO)',
    'SUPER_ADMIN',
    NULL,
    TRUE
),
(
    'admin@sakurazen.id',
    'admin_sakura',
    '081198765432',
    '$2b$10$Pzm7GlNBWlI30AgNat3NVOYoQMF8RW39FKxvtYj3gFTz8PJKXW672', -- sakura123
    'Admin Sakura Zen HO',
    'SUPER_ADMIN',
    NULL,
    TRUE
),
(
    'owner@sakurazen.id',
    'owner_moi',
    '081555443322',
    '$2b$10$jkY.kEyly6PkBhR.j1x5U.YkobNrug7o7h.7wekufPJ3jCteTNCgu', -- owner123
    'Mitra Owner MOI',
    'OWNER',
    1, -- Mall of Indonesia Lt 2
    TRUE
)
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = NOW();
