export type LocationStatus = 'active' | 'inactive';

export type IncomeEntity = 'OWNER' | 'SYSTEM' | 'PARTNER' | 'OTHER';

export interface IncomeBreakdownItem {
  id?: string;
  entity: IncomeEntity;
  party_name: string;
  percentage: number;
  is_default: boolean;
}

export interface Location {
  id: string; // UUID
  location_code: string; // e.g. "CP-01"
  name: string; // e.g. "Central Park Fl 1"
  address?: string;
  country?: string;
  state_province?: string;
  city?: string;
  pic_name?: string;
  pic_phone?: string;
  owner_share_pct: number; // e.g. 95.00
  system_share_pct: number; // e.g. 5.00
  income_breakdown?: IncomeBreakdownItem[];
  status: LocationStatus;
  notes?: string;
  chair_count?: number;
  online_chair_count?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export type ChairStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'MAINTENANCE';

export interface Chair {
  id: string | number; // e.g. 1 or 'SAKURA-GI-01'
  chair_code: string; // e.g. 'SAKURA-GI-01'
  name: string; // e.g. 'Sakura Series #01'
  model_type: string; // e.g. 'Tokuyo TC-355'
  location_name: string; // e.g. 'Grand Indonesia Lt 3'
  location_id?: string; // UUID FK
  status: ChairStatus;
  pin?: string;
  ip_address?: string;
  rssi?: number;
  last_heartbeat?: string;
  firmware_version?: string;
  target_firmware_version?: string;
  firmware_url?: string;
  ota_status?: 'IDLE' | 'PENDING' | 'DOWNLOADING' | 'SUCCESS' | 'FAILED' | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export type ClientDeviceType = 'ANDROID_TABLET' | 'IOT_KIOSK' | 'WEB_KIOSK' | string;

export type ChairSlipStatus =
  | 'pending'
  | 'paid'
  | 'paid_pending_delivery'
  | 'session_inprocess'
  | 'done'
  | 'expired'
  | 'failed'
  | 'cancelled'
  | 'expired_paid'
  // Legacy backward compatibility
  | 'PENDING'
  | 'PAID'
  | 'ONGOING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PaymentMethod = 'QRIS' | 'QRIS_MIDTRANS' | 'CASH';

// Main Operational Session Entity
export interface ChairSlip {
  id: string;
  chair_slip_number: string;
  chair_id: string;
  chair_code?: string;
  location_id?: string;
  customer_phone?: string;
  customer_email?: string;
  amount: number;
  duration_in_minutes: number;
  pulse_count: number;
  payment_method: PaymentMethod;
  status: ChairSlipStatus;
  qr_url?: string;
  qr_string?: string;
  session_start_at?: string;
  session_end_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  note?: string;
  created_from?: ClientDeviceType;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Gateway Payment Transaction Detail Entity
export interface ChairSlipPayment {
  id: string;
  chair_slip_id: string;
  pg_ref_number: string;
  edc_ref_number?: string;
  amount: number;
  sub_amount: number;
  mdr_fee: number;
  dev_share: number;
  owner_net: number;
  payment_method: PaymentMethod;
  payment_status: string;
  payment_token?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Audit Log & Read-Optimized Summary Entity
export interface ChairSlipSummaryDetail {
  id: string;
  chair_slip_id: string;
  chair_slip_payment_id?: string;
  chair_id?: string;
  chair_code?: string;
  chair_name?: string;
  model_type?: string;
  location_name?: string;
  location_id?: string;
  old_status?: string;
  new_status: string;
  changed_by: string;
  amount?: number;
  mdr_fee?: number;
  dev_share?: number;
  owner_net?: number;
  duration_in_minutes?: number;
  cancellation_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

// Financial Settlement Records Entity (H+2 Bank Payout)
export interface ChairSlipSettlement {
  id: string;
  chair_slip_id: string;
  chair_slip_payment_id?: string;
  payment_ref: string;
  gateway_settlement_status: string;
  gross_amount: number;
  net_amount: number;
  settlement_date?: string;
  checked_at?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

// Backward compatibility aliases
export type Transaction = ChairSlip;
export type TransactionStatus = ChairSlipStatus;

export interface PackageOption {
  id: string;
  amount: number;
  durationMinutes: number;
  pulseCount: number;
  label: string;
  isPopular?: boolean;
}

// Sakura PCB Timer Ratio: 4 Minutes (Rp 5.000) = 5 Pulses
export const PRD_PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: 'pkg_4m',
    amount: 5000,
    durationMinutes: 4,
    pulseCount: 5,
    label: '4 Menit',
  },
  {
    id: 'pkg_8m',
    amount: 10000,
    durationMinutes: 8,
    pulseCount: 10,
    label: '8 Menit',
  },
  {
    id: 'pkg_16m',
    amount: 20000,
    durationMinutes: 16,
    pulseCount: 20,
    label: '16 Menit',
    isPopular: true,
  },
  {
    id: 'pkg_40m',
    amount: 50000,
    durationMinutes: 40,
    pulseCount: 50,
    label: '40 Menit',
  },
];
