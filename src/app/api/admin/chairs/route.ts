import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Default initial units for fallback & auto-seeding
const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
];

// GET: Fetch all registered chairs (DB chairs + default safe chairs merged)
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
    const existingIds = new Set(dbChairs.map((c) => c.id));
    const mergedChairs = [...dbChairs];

    // Guarantee default initial units are always present
    DEFAULT_SAFE_CHAIRS.forEach((def) => {
      if (!existingIds.has(def.id)) {
        mergedChairs.push({ ...def, created_at: new Date().toISOString() });
      }
    });

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
      const { data: chair, error } = await supabaseServer
        .from('chairs')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error || !chair) {
        // Fallback for default initial units (SAKURA-GI-01, SAKURA-CP-01, SAKURA-MOI-01)
        const fallbackChair = DEFAULT_SAFE_CHAIRS.find((c) => c.id === cleanId);
        if (fallbackChair) {
          const validPin = fallbackChair.pin || '123456';
          if (cleanPin !== validPin) {
            return NextResponse.json({ success: false, error: 'PIN Password Salah. Silakan hubungi Admin.' }, { status: 401 });
          }

          // Auto-seed to Supabase DB so it persists permanently
          try {
            const newDbChair = {
              id: fallbackChair.id,
              name: fallbackChair.name,
              location_name: fallbackChair.location_name,
              status: 'ONLINE',
              is_active: true,
              pin: '123456',
              created_at: new Date().toISOString(),
            };
            await supabaseServer.from('chairs').upsert(newDbChair);
          } catch (seedErr) {
            console.warn('Auto-seed chair note:', seedErr);
          }

          return NextResponse.json({
            success: true,
            chair: {
              id: fallbackChair.id,
              name: fallbackChair.name,
              location_name: fallbackChair.location_name,
              status: 'ONLINE',
            },
          });
        }

        return NextResponse.json({ success: false, error: `ID Kursi '${cleanId}' tidak ditemukan di sistem.` }, { status: 404 });
      }

      // 2. Validate PIN from DB (Default '123456' if not custom set)
      const validPin = chair.pin || '123456';
      if (cleanPin !== validPin) {
        return NextResponse.json({ success: false, error: 'PIN Password Salah. Silakan hubungi Admin.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        chair: {
          id: chair.id,
          name: chair.name || `Sakura ${chair.id}`,
          location_name: chair.location_name || 'Lokasi Kiosk',
          status: chair.status || 'ONLINE',
        },
      });
    }

    // Action: REGISTER NEW CHAIR IN ADMIN DASHBOARD
    const cleanId = String(id || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();
    const cleanLocation = String(location_name || '').trim();

    if (!cleanId || !cleanName || !cleanLocation) {
      return NextResponse.json({ success: false, error: 'Semua field (ID Kursi, Nama, Lokasi) wajib diisi' }, { status: 400 });
    }

    const newChair = {
      id: cleanId,
      name: cleanName,
      location_name: cleanLocation,
      status: 'ONLINE',
      is_active: true,
      pin: pin || '123456',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from('chairs')
      .upsert(newChair)
      .select()
      .single();

    if (error) {
      console.warn('[API Admin Chairs] Upsert DB warning:', error);
    }

    return NextResponse.json({
      success: true,
      chair: data || newChair,
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
