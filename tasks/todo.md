# Task Checklist: Auth Hardening & User Management

- [x] **Task 1: Supabase Migration `11_admin_users_schema.sql`**
  - Acceptance: `admin_users` table created with `id`, `email`, `username`, `phone_number`, `password_hash`, `role` (`SUPER_ADMIN` / `OWNER`), `location_id`, `is_active`, `otp_code`, `otp_expires_at`, `last_login_at`, and initial seeded accounts.
  - Verify: SQL file is valid syntax.
  - Files: `supabase/migrations/11_admin_users_schema.sql`

- [x] **Task 2: Server Auth Core `src/lib/auth-server.ts` & `src/lib/jwt-edge.ts`**
  - Acceptance: Exported `hashPassword`, `comparePassword`, `signSessionJWT`, `verifySessionJWT`, `getAdminSession` functions using `bcryptjs` and `jose`.
  - Verify: `npx tsc --noEmit` passes with 0 errors.
  - Files: `src/lib/auth-server.ts`, `src/lib/jwt-edge.ts`

- [x] **Task 3: Next.js Middleware `src/middleware.ts`**
  - Acceptance: Protects `/admin/*` and `/api/admin/*`. Redirects unauthenticated users to `/admin/login`. Restricts `/admin/users` to `SUPER_ADMIN`.
  - Verify: Edge middleware compiles cleanly.
  - Files: `src/middleware.ts`

- [x] **Task 4: Hardened Auth APIs (`login`, `forgot-password`, `reset-password`, `me`)**
  - Acceptance: Login checks `admin_users` DB with `bcrypt.compare`, sets `httpOnly` cookie. Forgot/Reset Password validates OTP and updates `password_hash` in DB. `/me` returns user session details.
  - Verify: API endpoints compiled.
  - Files: `src/app/api/admin/auth/login/route.ts`, `src/app/api/admin/auth/forgot-password/route.ts`, `src/app/api/admin/auth/reset-password/route.ts`, `src/app/api/admin/auth/me/route.ts`

- [x] **Task 5: User Management API `/api/admin/users`**
  - Acceptance: GET user list, POST direct user creation in DB with bcrypt hash, PATCH update role/location/password override/active status.
  - Verify: API endpoint compiled.
  - Files: `src/app/api/admin/users/route.ts`

- [x] **Task 6: Dynamic Admin Header & Role-gated Sidebar**
  - Acceptance: Header shows logged in user name & role badge in Sakura Zen palette. Sidebar shows `User Management` menu item only for `SUPER_ADMIN`.
  - Verify: Rendered cleanly across roles.
  - Files: `src/components/admin/AdminHeader.tsx`, `src/components/admin/AdminSidebar.tsx`

- [x] **Task 7: User Management UI `/admin/users/page.tsx`**
  - Acceptance: Total active user counter, Search bar, `+ Tambah User Baru` modal, table with strictly Sakura Zen styled badges (`SUPER_ADMIN` Dusty Rose, `OWNER` Pink Accent).
  - Verify: `npx next build` passes cleanly.
  - Files: `src/app/admin/users/page.tsx`
