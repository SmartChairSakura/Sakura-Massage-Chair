import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Default initial units
const DEFAULT_SAFE_CHAIRS = [
  { id: 'SAKURA-GI-01', chair_code: 'SAKURA-GI-01', name: 'Sakura Series #01', model_type: 'Tokuyo TC-355', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-CP-01', chair_code: 'SAKURA-CP-01', name: 'Sakura Series #02', model_type: 'Tokuyo TC-355', location_name: 'Central Park Fl 1', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-MOI-01', chair_code: 'SAKURA-MOI-01', name: 'Sakura Series #03', model_type: 'Tokuyo TC-355', location_name: 'Mall of Indonesia Lt 2', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-PIK-01', chair_code: 'SAKURA-PIK-01', name: 'Sakura Series #04 - PIK', model_type: 'Tokuyo TC-355', location_name: 'Pantai Indah Kapuk', status: 'ONLINE', pin: '123456', is_active: true },
  { id: 'SAKURA-LVB-01', chair_code: 'SAKURA-LVB-01', name: 'Stagging Unit', model_type: 'Tokuyo TC-355', location_name: 'Living Mall Bekasi', status: 'ONLINE', pin: '123456', is_active: true },
];

// Global server-side registry to guarantee instant login & listing
const DYNAMIC_CHAIRS_REGISTRY = new Map<string, any>();
const DELETED_CHAIRS_SET = new Set<string>();
DEFAULT_SAFE_CHAIRS.forEach((c) => DYNAMIC_CHAIRS_REGISTRY.set(c.chair_code, c));

// GET: Fetch all registered active chairs from Supabase DB
export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    const { data: chairs, error } = await supabaseServer
      .from('chairs')
      .select('*')
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (error) {
      console.warn('[API Admin Chairs] GET DB fetch note:', { error: error.message, durationMs: Date.now() - startTime });
    }

    const dbChairs = chairs || [];
    const chairMap = new Map<string, any>();

    // 1. Add defaults (unless marked deleted)
    DEFAULT_SAFE_CHAIRS.forEach((c) => {
      if (!DELETED_CHAIRS_SET.has(c.chair_code)) {
        chairMap.set(c.chair_code, c);
      }
    });

    // 2. Add in-memory registry chairs
    DYNAMIC_CHAIRS_REGISTRY.forEach((v, k) => {
      if (!DELETED_CHAIRS_SET.has(k)) {
        chairMap.set(k, v);
      }
    });

    // 3. Overlay database chairs (DB is single source of truth)
    dbChairs.forEach((c) => {
      const codeKey = c.chair_code || String(c.id);
      if (!c.deleted_at && !DELETED_CHAIRS_SET.has(codeKey)) {
        chairMap.set(codeKey, {
          ...c,
          chair_code: codeKey,
          model_type: c.model_type || 'Tokuyo TC-355',
          pin: c.pin || '123456',
          status: c.status || 'ONLINE',
        });
      }
    });

    const mergedChairs = Array.from(chairMap.values()).map((c) => ({
      ...c,
      created_at: c.created_at || new Date().toISOString(),
    }));

    mergedChairs.sort((a, b) => String(a.chair_code || a.id).localeCompare(String(b.chair_code || b.id)));

    return NextResponse.json({
      success: true,
      chairs: mergedChairs,
      telemetry: {
        totalChairs: mergedChairs.length,
        dbSourceCount: dbChairs.length,
        durationMs: Date.now() - startTime,
      },
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', chairs: DEFAULT_SAFE_CHAIRS }, { status: 500 });
  }
}

// POST: Add new Chair or Login Verification
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { action, id, chair_code, name, model_type, location_name, pin } = body;

    const inputCode = String(chair_code || id || '').trim().toUpperCase();

    // Action: LOGIN / PAIRING EDC TERMINAL
    if (action === 'LOGIN') {
      const cleanPin = String(pin || '').trim();

      if (!inputCode || !cleanPin) {
        return NextResponse.json({ success: false, error: 'Kode Unit dan PIN Wajib Diisi' }, { status: 400 });
      }

      // 1. Query DB for chair by chair_code or id
      const { data: dbChair } = await supabaseServer
        .from('chairs')
        .select('*')
        .or(`chair_code.eq.${inputCode},id.eq.${inputCode}`)
        .is('deleted_at', null)
        .maybeSingle();

      // 2. Check in-memory registry or defaults
      const targetChair = dbChair || DYNAMIC_CHAIRS_REGISTRY.get(inputCode);

      if (!targetChair || DELETED_CHAIRS_SET.has(inputCode) || targetChair.deleted_at) {
        return NextResponse.json(
          { success: false, error: `Kode Unit '${inputCode}' tidak ditemukan atau telah dihapus.` },
          { status: 404 }
        );
      }

      // 3. Validate PIN (Default '123456')
      const validPin = targetChair.pin || '123456';
      if (cleanPin !== validPin) {
        return NextResponse.json({ success: false, error: 'PIN Password Salah. Silakan hubungi Admin.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        chair: {
          id: targetChair.id,
          chair_code: targetChair.chair_code || inputCode,
          name: targetChair.name || `Sakura ${inputCode}`,
          model_type: targetChair.model_type || 'Tokuyo TC-355',
          location_name: targetChair.location_name || 'Lokasi Kiosk',
          status: targetChair.status || 'ONLINE',
        },
      });
    }

    // Action: REGISTER NEW CHAIR IN ADMIN DASHBOARD
    const cleanName = String(name || '').trim();
    const cleanModelType = String(model_type || 'Tokuyo TC-355').trim();
    const cleanLocation = String(location_name || '').trim();
    const cleanPin = String(pin || '123456').trim();

    if (!inputCode || !cleanName || !cleanLocation) {
      return NextResponse.json(
        { success: false, error: 'Semua field (Kode Unit, Nama, Lokasi) wajib diisi' },
        { status: 400 }
      );
    }

    DELETED_CHAIRS_SET.delete(inputCode);

    const newChairObj: any = {
      chair_code: inputCode,
      name: cleanName,
      model_type: cleanModelType,
      location_name: cleanLocation,
      status: 'ONLINE',
      is_active: true,
      pin: cleanPin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Store in dynamic server registry
    DYNAMIC_CHAIRS_REGISTRY.set(inputCode, newChairObj);

    // Persist to Supabase Database
    let dbSynced = false;
    let dbErrorMsg = null;

    try {
      const { data, error } = await supabaseServer
        .from('chairs')
        .upsert({ id: inputCode, ...newChairObj })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('[API Admin Chairs] Primary DB Upsert warning:', error.message);
        const { data: fbData, error: fbError } = await supabaseServer
          .from('chairs')
          .upsert({
            id: inputCode,
            name: cleanName,
            location_name: cleanLocation,
            status: 'ONLINE',
            is_active: true,
            deleted_at: null,
          })
          .select()
          .maybeSingle();

        if (fbError) {
          dbErrorMsg = fbError.message;
        } else if (fbData) {
          dbSynced = true;
        }
      } else if (data) {
        dbSynced = true;
      }
    } catch (dbErr: any) {
      dbErrorMsg = dbErr?.message || 'DB network exception';
    }

    return NextResponse.json({
      success: true,
      db_synced: dbSynced,
      db_error: dbErrorMsg,
      chair: DYNAMIC_CHAIRS_REGISTRY.get(inputCode) || newChairObj,
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Soft delete a chair by ID or chair_code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('chair_code');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id / chair_code wajib diisi' }, { status: 400 });
    }

    const cleanId = String(id).trim();
    const now = new Date().toISOString();

    // Mark as deleted in server memory registry
    DELETED_CHAIRS_SET.add(cleanId.toUpperCase());
    DYNAMIC_CHAIRS_REGISTRY.delete(cleanId.toUpperCase());

    // Execute soft delete in Supabase Database (UPDATE deleted_at = now())
    let dbSuccess = false;
    let dbErr = null;

    try {
      const { error } = await supabaseServer
        .from('chairs')
        .update({ deleted_at: now, is_active: false })
        .or(`id.eq.${cleanId},chair_code.eq.${cleanId}`);

      if (error) {
        dbErr = error.message;
      } else {
        dbSuccess = true;
      }
    } catch (e: any) {
      dbErr = e?.message || 'DB network error';
    }

    console.info('[API Admin Chairs] DELETE soft-delete result:', { cleanId, dbSuccess, dbErr });

    return NextResponse.json({
      success: true,
      message: `Unit kursi '${cleanId}' berhasil dihapus.`,
      db_synced: dbSuccess,
      db_error: dbErr,
    });
  } catch (err: any) {
    console.error('[API Admin Chairs] DELETE Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
