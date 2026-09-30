import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET: Paginated & Filterable Ticket Transactions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('location_id') || searchParams.get('locationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('chair_slips')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply location filter if provided and not ALL
    if (locationId && locationId !== 'ALL') {
      query = query.eq('location_id', locationId);
    }

    // Apply status filter
    if (status && status !== 'ALL') {
      query = query.eq('status', status.toLowerCase());
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }

    // Apply search filter (chair_slip_number, customer_phone, chair_code)
    if (search) {
      const cleanSearch = search.trim();
      query = query.or(
        `chair_slip_number.ilike.%${cleanSearch}%,customer_phone.ilike.%${cleanSearch}%,chair_code.ilike.%${cleanSearch}%`
      );
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: tickets, count, error } = await query;

    if (error) {
      console.error('[API Tickets GET] DB Error:', error.message);
      return NextResponse.json({ success: false, error: error.message, tickets: [], pagination: { total: 0, page, limit, totalPages: 0 } }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error('[API Tickets GET] Exception:', err);
    return NextResponse.json({ success: false, error: err.message, tickets: [] }, { status: 500 });
  }
}
