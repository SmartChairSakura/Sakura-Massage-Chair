import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// PATCH: Update location details or status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = params.id;
    if (!locationId) {
      return NextResponse.json({ success: false, error: 'Location ID is required.' }, { status: 400 });
    }

    const body = await req.json();
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.location_code !== undefined) updatePayload.location_code = String(body.location_code).trim().toUpperCase();
    if (body.address !== undefined) updatePayload.address = String(body.address).trim();
    if (body.country !== undefined) updatePayload.country = String(body.country).trim();
    if (body.state_province !== undefined) updatePayload.state_province = String(body.state_province).trim();
    if (body.city !== undefined) updatePayload.city = String(body.city).trim();
    if (body.pic_name !== undefined) updatePayload.pic_name = String(body.pic_name).trim();
    if (body.pic_phone !== undefined) updatePayload.pic_phone = String(body.pic_phone).trim();
    if (body.income_breakdown !== undefined) updatePayload.income_breakdown = Array.isArray(body.income_breakdown) ? body.income_breakdown : null;
    if (body.notes !== undefined) updatePayload.notes = String(body.notes).trim();
    if (body.status !== undefined) updatePayload.status = body.status;

    if (body.owner_share_pct !== undefined || body.system_share_pct !== undefined) {
      const ownerPct = Number(body.owner_share_pct ?? 95.0);
      const systemPct = Number(body.system_share_pct ?? 5.0);
      if (Math.abs(ownerPct + systemPct - 100) > 0.01) {
        return NextResponse.json(
          { success: false, error: 'Total revenue share must equal exactly 100%.' },
          { status: 400 }
        );
      }
      updatePayload.owner_share_pct = ownerPct;
      updatePayload.system_share_pct = systemPct;
    }

    const { data, error } = await supabaseServer
      .from('locations')
      .update(updatePayload)
      .eq('id', locationId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Location PATCH] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully.',
      location: data,
    });
  } catch (err: any) {
    console.error('[API Location PATCH] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Soft-delete location (verifies no active chairs linked first)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = params.id;
    if (!locationId) {
      return NextResponse.json({ success: false, error: 'Location ID is required.' }, { status: 400 });
    }

    // 1. Check if location has active chairs linked
    const { data: chairs, error: chairError } = await supabaseServer
      .from('chairs')
      .select('id, chair_code, name')
      .eq('location_id', locationId)
      .is('deleted_at', null);

    if (chairError) {
      console.error('[API Location DELETE] Chair Check Error:', chairError.message);
    }

    if (chairs && chairs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete location. There are still ${chairs.length} active chairs assigned to this location. Please remove or reassign them first.`,
          active_chairs_count: chairs.length,
        },
        { status: 400 }
      );
    }

    // 2. Perform soft-delete
    const { error } = await supabaseServer
      .from('locations')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
      })
      .eq('id', locationId);

    if (error) {
      console.error('[API Location DELETE] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully.',
    });
  } catch (err: any) {
    console.error('[API Location DELETE] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
