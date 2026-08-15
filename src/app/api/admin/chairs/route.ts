import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET: Fetch all active chairs directly from DB (no cache, no defaults)
export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    const { data: chairs, error } = await supabaseServer
      .from('chairs')
      .select('*')
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (error) {
      console.error('[API Chairs GET] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message, chairs: [] }, { status: 500 });
    }

    const safeChairs = (chairs || []).map((c: any) => ({
      ...c,
      chair_code: c.chair_code || String(c.id),
      model_type: c.model_type || 'Tokuyo TC-355',
      pin: c.pin || '123456',
      status: c.status || 'ONLINE',
    }));

    return NextResponse.json({
      success: true,
      chairs: safeChairs,
      telemetry: { totalChairs: safeChairs.length, durationMs: Date.now() - startTime },
    });
  } catch (err: any) {
    console.error('[API Chairs GET] Exception:', err);
    return NextResponse.json({ success: false, error: err.message, chairs: [] }, { status: 500 });
  }
}

// POST: Register new chair or Login verification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, chair_code, name, model_type, location_name, pin } = body;
    const inputCode = String(chair_code || id || '').trim().toUpperCase();

    // === LOGIN / PAIRING EDC ===
    if (action === 'LOGIN') {
      const cleanPin = String(pin || '').trim();
      if (!inputCode || !cleanPin) {
        return NextResponse.json({ success: false, error: 'Kode Unit dan PIN wajib diisi' }, { status: 400 });
      }

      const { data: chair, error } = await supabaseServer
        .from('chairs')
        .select('*')
        .eq('chair_code', inputCode)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[API Chairs LOGIN] DB error:', error.message);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
      }
      if (!chair) {
        return NextResponse.json({ success: false, error: `Kode Unit '${inputCode}' tidak ditemukan.` }, { status: 404 });
      }

      const validPin = chair.pin || '123456';
      if (cleanPin !== validPin) {
        return NextResponse.json({ success: false, error: 'PIN Password Salah.' }, { status: 401 });
      }

      return NextResponse.json({ success: true, chair });
    }

    // === REGISTER NEW CHAIR ===
    const cleanName = String(name || '').trim();
    const cleanModelType = String(model_type || 'Tokuyo TC-355').trim();
    const cleanLocation = String(location_name || '').trim();
    const cleanPin = String(pin || '123456').trim();

    if (!inputCode || !cleanName || !cleanLocation) {
      return NextResponse.json({ success: false, error: 'Kode Unit, Nama, dan Lokasi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('chairs')
      .upsert({
        chair_code: inputCode,
        name: cleanName,
        model_type: cleanModelType,
        location_name: cleanLocation,
        status: 'ONLINE',
        is_active: true,
        pin: cleanPin,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }, { onConflict: 'chair_code' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Chairs POST] DB upsert error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, db_synced: true, chair: data });
  } catch (err: any) {
    console.error('[API Chairs POST] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Soft delete a chair by chair_code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chairCode = searchParams.get('id') || searchParams.get('chair_code');

    if (!chairCode) {
      return NextResponse.json({ success: false, error: 'Parameter chair_code wajib diisi' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('chairs')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('chair_code', chairCode.trim());

    if (error) {
      console.error('[API Chairs DELETE] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Unit '${chairCode}' berhasil dihapus.` });
  } catch (err: any) {
    console.error('[API Chairs DELETE] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update an existing chair by ID or chair_code
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, chair_code, name, model_type, location_name, pin, status } = body;
    const targetCode = String(chair_code || id || '').trim().toUpperCase();

    if (!targetCode) {
      return NextResponse.json({ success: false, error: 'Kode Unit / ID wajib diisi.' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = String(name).trim();
    if (model_type !== undefined) updateData.model_type = String(model_type).trim();
    if (location_name !== undefined) updateData.location_name = String(location_name).trim();
    if (pin !== undefined) updateData.pin = String(pin).trim();
    if (status !== undefined) updateData.status = String(status).trim();

    const { data, error } = await supabaseServer
      .from('chairs')
      .update(updateData)
      .eq('chair_code', targetCode)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Chairs PATCH] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, chair: data });
  } catch (err: any) {
    console.error('[API Chairs PATCH] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
