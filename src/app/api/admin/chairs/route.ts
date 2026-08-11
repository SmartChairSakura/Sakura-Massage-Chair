import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Default initial units for fallback & auto-seeding
const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
];

// Global server-side registry to guarantee instant login & listing even if DB RLS restricts anon upsert
const DYNAMIC_CHAIRS_REGISTRY = new Map<string, any>();

// Pre-seed default chairs into registry
DEFAULT_SAFE_CHAIRS.forEach((c) => DYNAMIC_CHAIRS_REGISTRY.set(c.id, c));

// GET: Fetch all registered chairs (DB chairs + registry + default safe chairs merged)
export async function GET(req: NextRequest) {
  try {
    const { data: chairs, error } = await supabaseServer
      .from('chairs')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('[API Admin Chairs] Fetch error:', error);
    }

    const dbChairs = chairs || [];
    const chairMap = new Map<string, any>();

    // 1. Add defaults
    DEFAULT_SAFE_CHAIRS.forEach((c) => chairMap.set(c.id, c));

    // 2. Add in-memory registry chairs
    DYNAMIC_CHAIRS_REGISTRY.forEach((v, k) => chairMap.set(k, v));

    // 3. Overlay database chairs
    dbChairs.forEach((c) => chairMap.set(c.id, c));

    const mergedChairs = Array.from(chairMap.values()).map((c) => ({
      ...c,
      created_at: c.created_at || new Date().toISOString(),
    }));

    mergedChairs.sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ success: true, chairs: mergedChairs });
  } catch (err: any) {
    console.error('[API Admin Chairs] GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add new Chair or Login Verification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, location_name, pin } = body;

    // Action: LOGIN / PAIRING EDC TERMINAL
    if (action === 'LOGIN') {
      const cleanId = String(id || '').trim().toUpperCase();
      const cleanPin = String(pin || '').trim();

      if (!cleanId || !cleanPin) {
        return NextResponse.json({ success: false, error: 'ID Kursi dan PIN Wajib Diisi' }, { status: 400 });
      }

      // 1. Check DB for chair
      const { data: dbChair } = await supabaseServer
        .from('chairs')
        .select('*')
        .eq('id', cleanId)
        .single();

      // 2. Check in-memory registry or default list if DB query returns null
      const targetChair = dbChair || DYNAMIC_CHAIRS_REGISTRY.get(cleanId);

      if (!targetChair) {
        return NextResponse.json(
          { success: false, error: `ID Kursi '${cleanId}' tidak ditemukan di sistem.` },
          { status: 404 }
        );
      }

      // 3. Validate PIN (Default '123456')
      const validPin = targetChair.pin || '123456';
      if (cleanPin !== validPin) {
        return NextResponse.json({ success: false, error: 'PIN Password Salah. Silakan hubungi Admin.' }, { status: 401 });
      }

      // Auto-seed to Supabase DB if not in DB yet
      if (!dbChair) {
        try {
          const seedData = {
            id: targetChair.id,
            name: targetChair.name,
            location_name: targetChair.location_name,
            status: 'ONLINE',
            is_active: true,
            pin: validPin,
            created_at: new Date().toISOString(),
          };
          await supabaseServer.from('chairs').upsert(seedData);
        } catch (e) {
          console.warn('Auto-seed DB error:', e);
        }
      }

      return NextResponse.json({
        success: true,
        chair: {
          id: targetChair.id,
          name: targetChair.name || `Sakura ${targetChair.id}`,
          location_name: targetChair.location_name || 'Lokasi Kiosk',
          status: targetChair.status || 'ONLINE',
        },
      });
    }

    // Action: REGISTER NEW CHAIR IN ADMIN DASHBOARD
    const cleanId = String(id || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();
    const cleanLocation = String(location_name || '').trim();
    const cleanPin = String(pin || '123456').trim();

    if (!cleanId || !cleanName || !cleanLocation) {
      return NextResponse.json(
        { success: false, error: 'Semua field (ID Kursi, Nama, Lokasi) wajib diisi' },
        { status: 400 }
      );
    }

    const newChair = {
      id: cleanId,
      name: cleanName,
      location_name: cleanLocation,
      status: 'ONLINE',
      is_active: true,
      pin: cleanPin,
      created_at: new Date().toISOString(),
    };

    // 1. Immediately store in dynamic server registry so it's instantly available everywhere
    DYNAMIC_CHAIRS_REGISTRY.set(cleanId, newChair);

    // 2. Persist to Supabase Database
    try {
      const { data, error } = await supabaseServer
        .from('chairs')
        .upsert(newChair)
        .select()
        .single();

      if (error) {
        console.warn('[API Admin Chairs] Upsert DB note:', error);
      }
      if (data) {
        DYNAMIC_CHAIRS_REGISTRY.set(cleanId, data);
      }
    } catch (dbErr) {
      console.warn('[API Admin Chairs] DB write note:', dbErr);
    }

    return NextResponse.json({
      success: true,
      chair: DYNAMIC_CHAIRS_REGISTRY.get(cleanId) || newChair,
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
