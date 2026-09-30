import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';

// GET: List all active locations with aggregated chair count
export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', locations: [] }, { status: 401 });
    }

    const { data: locations, error } = await supabaseServer
      .from('locations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API Locations GET] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message, locations: [] }, { status: 500 });
    }

    // Fetch chairs to compute chair count per location
    const { data: chairs } = await supabaseServer
      .from('chairs')
      .select('id, location_id, location_name, status')
      .is('deleted_at', null);

    const chairList = chairs || [];

    const enrichedLocations = (locations || []).map((loc: any) => {
      const locChairs = chairList.filter(
        (c: any) => c.location_id === loc.id || c.location_name === loc.name
      );
      const onlineCount = locChairs.filter((c: any) => (c.status || 'ONLINE') === 'ONLINE').length;

      return {
        ...loc,
        chair_count: locChairs.length,
        online_chair_count: onlineCount,
      };
    });

    return NextResponse.json({
      success: true,
      locations: enrichedLocations,
    });
  } catch (err: any) {
    console.error('[API Locations GET] Exception:', err);
    return NextResponse.json({ success: false, error: err.message, locations: [] }, { status: 500 });
  }
}

// POST: Register new location
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      location_code,
      name,
      address,
      country,
      state_province,
      city,
      pic_name,
      pic_phone,
      owner_share_pct,
      system_share_pct,
      income_breakdown,
      notes,
    } = body;

    const cleanCode = String(location_code || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();
    const ownerPct = Number(owner_share_pct ?? 95.0);
    const systemPct = Number(system_share_pct ?? 5.0);

    if (!cleanCode || !cleanName) {
      return NextResponse.json(
        { success: false, error: 'Site code and branch name are required.' },
        { status: 400 }
      );
    }

    if (Math.abs(ownerPct + systemPct - 100) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Total revenue share must equal exactly 100%.' },
        { status: 400 }
      );
    }

    const newLocationObj: any = {
      location_code: cleanCode,
      name: cleanName,
      address: String(address || '').trim(),
      country: String(country || 'Indonesia').trim(),
      state_province: String(state_province || 'DKI Jakarta').trim(),
      city: String(city || 'Jakarta').trim(),
      pic_name: String(pic_name || 'Operational Team').trim(),
      pic_phone: String(pic_phone || '08123456789').trim(),
      owner_share_pct: ownerPct,
      system_share_pct: systemPct,
      income_breakdown: Array.isArray(income_breakdown) ? income_breakdown : null,
      status: 'active',
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    if (notes && String(notes).trim()) {
      newLocationObj.notes = String(notes).trim();
    }

    const { data, error } = await supabaseServer
      .from('locations')
      .upsert(newLocationObj, { onConflict: 'location_code' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Locations POST] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Location '${cleanName}' saved successfully.`,
      location: data,
    });
  } catch (err: any) {
    console.error('[API Locations POST] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
