# ADR 001: Pilot Payment Architecture, Database Safeguards & Queue Evolution (PARKEE 3-Tier Pattern)

- **Status:** Accepted (Phase 1 Approved)
- **Deciders:** Lead Systems Architect & SupEng / TSE Team
- **Date:** 2026-08-14
- **Technical Context:** Smart Kursi Pijat Sakura — Hybrid QRIS + EDC System

---

## 1. Context & Business Problem

Sistem Smart Kursi Pijat Sakura menghubungkan Web Kiosk EDC (Android/Browser), Serverless Backend (Vercel Next.js), Payment Gateway (Midtrans QRIS), dan Hardware Relay (LCUS-1 USB Relay / Serial).

Untuk menjamin kelancaran transaksi QRIS dan mencegah kerugian operasional (seperti uang masuk tapi kursi tidak jalan, atau pulsa terkirim 2x karena duplicate webhook), diterapkan arsitektur penanganan pembayaran (*Payment Hardening*), *State Machine*, dan antrean (*Queue*).

---

## 2. Decision: 2-Phase Queue Architecture

### 🟢 Phase 1: Pilot / R&D (1 – 5 Unit Kursi)
**Keputusan:** **SKIP BullMQ & Redis**. Gunakan **Database State Machine + Vercel Cron Job + Supabase Realtime Broadcast**.

#### Alasan Arsitektur & Justifikasi:
1. **Serverless Environment Fit:** Vercel Next.js App Router beroperasi secara serverless. Menjalankan BullMQ *Worker* membutuhkan persistent background process 24/7 (misal di Railway/Render) serta Redis broker (Upstash). Untuk 5 unit pilot dengan volume rendah (<100 transaksi/hari), overhead infrastruktur dan devops ini belum sebanding.
2. **Kecukupan Kapasitas:** Database PostgreSQL Supabase dengan *Row Locking* (`FOR UPDATE` / atomic `UPDATE ... WHERE status = 'pending'`) + Unique Constraint `chair_slip_number` sudah **100% mampu mencegah race condition dan duplicate execution** pada volume 5 unit.
3. **Reconciliation Backup:** Kegagalan webhook atau koneksi sementara ditangani secara otomatis oleh Vercel Cron (`/api/cron/reconcile`) yang berjalan setiap 5 menit untuk query status transaksi `pending` langsung ke Midtrans Check API.

---

### 🚀 Phase 2: Commercial Scale (15 – 25+ Unit Kursi)
**Keputusan:** **Upgrade ke BullMQ + Upstash Redis + Worker Daemon (Railway/Render)**.

---

## 3. Database Schema Enhancements (PARKEE 3-Tier Adaption)

```sql
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

-- Status Constraint
ALTER TABLE chair_slips ADD CONSTRAINT valid_chair_slip_status CHECK (
  status IN (
    'pending', 'paid', 'paid_pending_delivery', 
    'session_inprocess', 'done', 'expired', 
    'failed', 'cancelled', 'expired_paid'
  )
);

-- 2. Detailed Gateway Payments Table (Chair Slip Payments)
CREATE TABLE IF NOT EXISTS chair_slip_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chair_slip_id UUID REFERENCES chair_slips(id) ON DELETE CASCADE,
  pg_ref_number VARCHAR(100) NOT NULL,
  edc_ref_number VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  sub_amount NUMERIC(12,2) NOT NULL,
  mdr_fee NUMERIC(12,2) DEFAULT 0,
  dev_share NUMERIC(12,2) DEFAULT 0,
  owner_net NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'QRIS_MIDTRANS',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Audit & Read-Optimized Summary Table (Chair Slip Summary Detail)
CREATE TABLE IF NOT EXISTS chair_slip_summary_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chair_slip_id UUID REFERENCES chair_slips(id) ON DELETE CASCADE,
  chair_slip_payment_id UUID REFERENCES chair_slip_payments(id) ON DELETE SET NULL,
  chair_id VARCHAR(100),
  chair_name VARCHAR(100),
  location_name VARCHAR(150),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2),
  mdr_fee NUMERIC(12,2),
  dev_share NUMERIC(12,2),
  owner_net NUMERIC(12,2),
  duration_in_minutes INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
