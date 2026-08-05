import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET: Fetch all registered chairs
export async function GET(req: NextRequest) {
  try {
    const { data: chairs, error } = await supabaseServer
      .from('chairs')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('[API Admin Chairs] Fetch error:', error);
    }

    const safeChairs = chairs && chairs.length > 0 ? chairs : [
      { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
      { id: 'SAKURA-CP-01', name: 'Sakura Series #02', location_name: 'Central Park Fl 1', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
      { id: 'SAKURA-MOI-01', name: 'Sakura Series #03', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', is_active: true, created_at: new Date().toISOString() },
    ];

    return NextResponse.json({ success: true, chairs: safeChairs });
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

      // Check DB for chair
      const { data: chair, error } = await supabaseServer
        .from('chairs')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error || !chair) {
        // Fallback for default initial units if DB table is empty
        if (cleanId === 'SAKURA-GI-01' && cleanPin === '123456') {
          return NextResponse.json({
            success: true,
            chair: { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE' }
          });
        }
        return NextResponse.json({ success: false, error: `ID Kursi '${cleanId}' tidak ditemukan di sistem.` }, { status: 404 });
      }

      // Validate PIN (Default '123456' if not custom set)
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
          status: chair.status || 'ONLINE'
        }
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
      chair: data || newChair
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
