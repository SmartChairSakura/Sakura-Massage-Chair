import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';

// GET: List all chairs scoped to a specific location_id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', chairs: [] }, { status: 401 });
    }

    const locationId = params.id;
    if (!locationId) {
      return NextResponse.json({ success: false, error: 'ID Lokasi wajib diisi.', chairs: [] }, { status: 400 });
    }

    // 1. Fetch location details first
    const { data: location } = await supabaseServer
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle();

    // 2. Fetch chairs filtered by location_id or matching location_name
    let chairQuery = supabaseServer
      .from('chairs')
      .select('*')
      .is('deleted_at', null);

    if (location) {
      chairQuery = chairQuery.or(`location_id.eq.${locationId},location_name.eq.${location.name}`);
    } else {
      chairQuery = chairQuery.eq('location_id', locationId);
    }

    const { data: chairs, error } = await chairQuery.order('id', { ascending: true });

    if (error) {
      console.error('[API Scoped Chairs GET] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message, chairs: [] }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      location: location || null,
      chairs: chairs || [],
    });
  } catch (err: any) {
    console.error('[API Scoped Chairs GET] Exception:', err);
    return NextResponse.json({ success: false, error: err.message, chairs: [] }, { status: 500 });
  }
}
