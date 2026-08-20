# Implementation Plan: Auth Hardening, Next.js Middleware & User Management (SUPER_ADMIN & OWNER)

## Overview
Production-grade authentication hardening: Next.js edge middleware route protection, database user storage (`admin_users`) in Supabase with `bcryptjs` password hashing, signed HTTP-Only session cookies (`jose`), and User Management UI (`/admin/users`) styled strictly in the Sakura Zen theme.

## Key Decisions
- **Roles**: Simplified to 2 roles (`SUPER_ADMIN` and `OWNER`).
- **Styling**: Sakura Zen Theme (`#795465` Dusty Rose, `#F8C8DC` Pink Accent, `#FBF9F9` Soft Background). No rainbow badge colors.
- **Forgot Password UX**: OTP 6-digit sent via SMTP (or shown in dev) -> self-service password reset in DB.
- **User Creation**: Direct creation in DB by Super Admin with initial password -> instant login without blocking verification links.

## Task List

### Phase 1: Database Schema & Server Auth Core
- [ ] Task 1: Migration `11_admin_users_schema.sql` (schema, indexes, bcrypt seeded initial accounts)
- [ ] Task 2: Server Auth Helper `src/lib/auth-server.ts` (bcrypt, JWT JOSE sign/verify, DB helper)

### Phase 2: Middleware Route Guard & Auth Hardening
- [ ] Task 3: Middleware `src/middleware.ts` for route protection & role guard
- [ ] Task 4: Hardened Auth APIs (`/api/admin/auth/login`, `forgot-password`, `reset-password`, `me`)

### Phase 3: User Management API & UI
- [ ] Task 5: User Management CRUD API `/api/admin/users`
- [ ] Task 6: Dynamic `AdminHeader.tsx` & Role-gated `AdminSidebar.tsx`
- [ ] Task 7: User Management UI Page `/admin/users/page.tsx`

### Checkpoint: Verification
- [ ] `npx tsc --noEmit` -> 0 errors
- [ ] `npx next build` -> 100% compiled
- [ ] E2E Manual check (login, redirect, user creation, logout)
