export type ChairStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'MAINTENANCE';

export interface Chair {
  id: string; // e.g. 'TOK-GI-01'
  name: string; // e.g. 'Tokuyo Deluxe #01'
  location_name: string; // e.g. 'Grand Indonesia Lt 3'
  status: ChairStatus;
  last_heartbeat?: string;
  firmware_version?: string;
  is_active: boolean;
  created_at: string;
}

export type TransactionStatus = 'PENDING' | 'PAID' | 'ONGOING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'QRIS' | 'CASH';

export interface Transaction {
  id: string;
  idempotency_key: string;
  chair_id: string;
  customer_phone?: string;
  customer_email?: string;
  amount: number;
  duration_minutes: number;
  pulse_count: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  payment_gateway_ref?: string;
  qr_url?: string;
  session_start_at?: string;
  session_end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PackageOption {
  id: string;
  amount: number;
  durationMinutes: number;
  pulseCount: number;
  label: string;
  isPopular?: boolean;
}

// Tokuyo PCB Timer logic: 5 Minutes = 5 Pulses (Rp 5.000)
export const PRD_PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: 'pkg_5m',
    amount: 5000,
    durationMinutes: 5,
    pulseCount: 5,
    label: '5 Menit',
  },
  {
    id: 'pkg_10m',
    amount: 10000,
    durationMinutes: 10,
    pulseCount: 10,
    label: '10 Menit',
  },
  {
    id: 'pkg_20m',
    amount: 20000,
    durationMinutes: 20,
    pulseCount: 20,
    label: '20 Menit',
    isPopular: true,
  },
  {
    id: 'pkg_50m',
    amount: 50000,
    durationMinutes: 50,
    pulseCount: 50,
    label: '50 Menit',
  },
];
