import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// GET: List all active locations with aggregated chair count
export async function GET(req: NextRequest) {
  try {
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
      city,
      pic_name,
      pic_phone,
      owner_share_pct,
      system_share_pct,
      notes,
    } = body;

    const cleanCode = String(location_code || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();
    const ownerPct = Number(owner_share_pct ?? 95.0);
    const systemPct = Number(system_share_pct ?? 5.0);

    if (!cleanCode || !cleanName) {
      return NextResponse.json(
        { success: false, error: 'Kode Unik Lokasi dan Nama Lokasi wajib diisi.' },
        { status: 400 }
      );
    }

    if (Math.abs(ownerPct + systemPct - 100) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Total persentase Hak Owner + Bagi Hasil System harus 100%.' },
        { status: 400 }
      );
    }

    const newLocationObj = {
      location_code: cleanCode,
      name: cleanName,
      address: String(address || '').trim(),
      city: String(city || 'Jakarta').trim(),
      pic_name: String(pic_name || 'Operational Team').trim(),
      pic_phone: String(pic_phone || '08123456789').trim(),
      owner_share_pct: ownerPct,
      system_share_pct: systemPct,
      status: 'active',
      notes: String(notes || '').trim(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

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
      message: `Lokasi '${cleanName}' berhasil disimpan.`,
      location: data,
    });
  } catch (err: any) {
    console.error('[API Locations POST] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
