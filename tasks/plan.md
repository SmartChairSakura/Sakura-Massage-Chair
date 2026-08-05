# Implementation Plan: Multi-Location Chair Management & EDC Kiosk Pairing

## Overview
Fitur Manajemen Lokasi & Armada Kursi Pijat (`/admin`) dan Layar Initial Pairing Kiosk (`/setup`) untuk mengikat perangkat EDC dengan ID Kursi spesifik (`SAKURA-GI-01`, `SAKURA-CP-01`), sehingga seluruh transaksi QRIS tercatat tepat per lokasi cabang di Admin Dashboard.

## Task List

### Phase 1: API & Chair Fleet Management
- [ ] Task 1: API Route `/api/admin/chairs` for Chair CRUD
- [ ] Task 2: Initial Pairing Kiosk EDC Screen (`/setup`)

### Checkpoint: Pairing & Registration
- [ ] EDC Terminal correctly pairs and stores `chair_id` in `localStorage`
- [ ] Transactions carry correct `chair_id`

### Phase 2: Admin Multi-Location Management & Filter UI
- [ ] Task 3: Modal "+ Tambah Unit Kursi" in Admin Dashboard
- [ ] Task 4: Multi-Location Branch Filter in Admin Dashboard
