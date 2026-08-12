import { Chair, ChairStatus } from '@/types';

export interface ChairUnit extends Chair {
  pin: string;
}

export const DEFAULT_SAFE_CHAIRS: ChairUnit[] = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
];

const LOCAL_STORAGE_KEY = 'sakura_registered_chairs';

// Read all registered chairs on client (defaults + localStorage)
export function getLocalRegisteredChairs(): ChairUnit[] {
  if (typeof window === 'undefined') return DEFAULT_SAFE_CHAIRS;

  const chairMap = new Map<string, ChairUnit>();
  DEFAULT_SAFE_CHAIRS.forEach((c) => chairMap.set(c.id, c));

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: ChairUnit[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((c) => {
          if (c && c.id) chairMap.set(c.id.toUpperCase(), c);
        });
      }
    }
  } catch (e) {
    console.warn('Read local registered chairs note:', e);
  }

  const result = Array.from(chairMap.values());
  result.sort((a, b) => a.id.localeCompare(b.id));
  return result;
}

// Save a newly registered chair on client
export function saveLocalRegisteredChair(newChair: ChairUnit): ChairUnit[] {
  if (typeof window === 'undefined') return DEFAULT_SAFE_CHAIRS;

  const current = getLocalRegisteredChairs();
  const chairMap = new Map<string, ChairUnit>();
  current.forEach((c) => chairMap.set(c.id, c));
  chairMap.set(newChair.id.toUpperCase(), newChair);

  const updated = Array.from(chairMap.values());
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Save local registered chair note:', e);
  }
  return updated;
}

// Verify EDC Login against local & default registry
export function verifyLocalChairLogin(id: string, pin: string): { success: boolean; chair?: ChairUnit; error?: string } {
  const cleanId = id.trim().toUpperCase();
  const cleanPin = pin.trim();

  const chairs = getLocalRegisteredChairs();
  const found = chairs.find((c) => c.id === cleanId);

  if (!found) {
    return { success: false, error: `ID Kursi '${cleanId}' tidak ditemukan di sistem.` };
  }

  const validPin = found.pin || '123456';
  if (cleanPin !== validPin) {
    return { success: false, error: 'PIN Password Salah. Silakan hubungi Admin.' };
  }

  return { success: true, chair: found };
}
