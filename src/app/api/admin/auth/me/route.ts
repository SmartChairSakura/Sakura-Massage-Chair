import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Tidak ada sesi aktif.' },
        { status: 401 }
      );
    }

    // Optionally fetch location name if location_id exists
    let locationName: string | null = null;
    if (session.location_id) {
      const { data: loc } = await supabaseServer
        .from('locations')
        .select('name')
        .eq('id', session.location_id)
        .maybeSingle();
      if (loc) {
        locationName = loc.name;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        ...session,
        location_name: locationName,
      },
    });
  } catch (err: any) {
    console.error('[API Admin Auth Me] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
