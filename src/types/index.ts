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

// Fixed: Tokuyo PCB Timer logic: 1 Pulse = 1 Minute
export const PRD_PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: 'pkg_4m',
    amount: 5000,
    durationMinutes: 4,
    pulseCount: 4,
    label: '4 Menit',
  },
  {
    id: 'pkg_8m',
    amount: 10000,
    durationMinutes: 8,
    pulseCount: 8,
    label: '8 Menit',
  },
  {
    id: 'pkg_16m',
    amount: 20000,
    durationMinutes: 16,
    pulseCount: 16,
    label: '16 Menit',
    isPopular: true,
  },
  {
    id: 'pkg_40m',
    amount: 50000,
    durationMinutes: 40,
    pulseCount: 40,
    label: '40 Menit',
  },
];
