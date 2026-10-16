import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';
import { getWibDateRange, mapStatusFilter } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// GET: Paginated & Filterable Ticket Transactions with WIB Precision
export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', tickets: [] },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('location_id') || searchParams.get('locationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const searchBy = searchParams.get('search_by') || 'ALL';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const timeFrom = searchParams.get('time_from') || '00:00';
    const timeTo = searchParams.get('time_to') || '23:59';
    const range = searchParams.get('range');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('chair_slips')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 1. Apply robust location filter (matching location_id OR known chair codes for location)
    if (locationId && locationId !== 'ALL') {
      const { data: locObj } = await supabaseServer
        .from('locations')
        .select('id, name')
        .eq('id', locationId)
        .maybeSingle();

      const { data: locChairs } = await supabaseServer
        .from('chairs')
        .select('chair_code, id')
        .or(`location_id.eq.${locationId}${locObj?.name ? `,location_name.eq.${locObj.name}` : ''}`);

      const chairCodes = (locChairs || []).map((c: any) => c.chair_code).filter(Boolean);
      if (chairCodes.length > 0) {
        query = query.or(
          `location_id.eq.${locationId},chair_code.in.(${chairCodes.join(',')}),chair_id.in.(${chairCodes.join(',')})`
        );
      } else {
        query = query.eq('location_id', locationId);
      }
    }

    // 2. Apply status filter with multi-status alias mapping (done, waiting, unpaid, etc.)
    const statusList = mapStatusFilter(status);
    if (statusList && statusList.length > 0) {
      query = query.in('status', statusList);
    }

    // 3. Apply date range filters with WIB timezone (+07:00) boundaries
    const { startIso, endIso } = getWibDateRange(range, dateFrom, dateTo, timeFrom, timeTo);
    if (startIso) {
      query = query.gte('created_at', startIso);
    }
    if (endIso) {
      query = query.lte('created_at', endIso);
    }

    // 4. Apply search filter
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      if (searchBy === 'TICKET_NUMBER') {
        query = query.ilike('chair_slip_number', `%${cleanSearch}%`);
      } else if (searchBy === 'CHAIR_CODE') {
        query = query.or(`chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`);
      } else if (searchBy === 'PHONE') {
        query = query.ilike('customer_phone', `%${cleanSearch}%`);
      } else {
        query = query.or(
          `chair_slip_number.ilike.%${cleanSearch}%,customer_phone.ilike.%${cleanSearch}%,chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`
        );
      }
    }

    // 5. Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: tickets, count, error } = await query;

    if (error) {
      console.error('[API Tickets GET] DB Error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          tickets: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Compute accurate KPI summary metrics across ALL matching tickets (not just current page slice)
    let summaryQuery = supabaseServer.from('chair_slips').select('amount, status');

    if (locationId && locationId !== 'ALL') {
      const { data: locObj } = await supabaseServer
        .from('locations')
        .select('id, name')
        .eq('id', locationId)
        .maybeSingle();

      const { data: locChairs } = await supabaseServer
        .from('chairs')
        .select('chair_code, id')
        .or(`location_id.eq.${locationId}${locObj?.name ? `,location_name.eq.${locObj.name}` : ''}`);

      const chairCodes = (locChairs || []).map((c: any) => c.chair_code).filter(Boolean);
      if (chairCodes.length > 0) {
        summaryQuery = summaryQuery.or(
          `location_id.eq.${locationId},chair_code.in.(${chairCodes.join(',')}),chair_id.in.(${chairCodes.join(',')})`
        );
      } else {
        summaryQuery = summaryQuery.eq('location_id', locationId);
      }
    }

    if (statusList && statusList.length > 0) {
      summaryQuery = summaryQuery.in('status', statusList);
    }
    if (startIso) {
      summaryQuery = summaryQuery.gte('created_at', startIso);
    }
    if (endIso) {
      summaryQuery = summaryQuery.lte('created_at', endIso);
    }
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      if (searchBy === 'TICKET_NUMBER') {
        summaryQuery = summaryQuery.ilike('chair_slip_number', `%${cleanSearch}%`);
      } else if (searchBy === 'CHAIR_CODE') {
        summaryQuery = summaryQuery.or(`chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`);
      } else if (searchBy === 'PHONE') {
        summaryQuery = summaryQuery.ilike('customer_phone', `%${cleanSearch}%`);
      } else {
        summaryQuery = summaryQuery.or(
          `chair_slip_number.ilike.%${cleanSearch}%,customer_phone.ilike.%${cleanSearch}%,chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`
        );
      }
    }

    const { data: allMatching } = await summaryQuery;

    let totalGrossSales = 0;
    let totalCompletedSessions = 0;
    (allMatching || []).forEach((t: any) => {
      const st = String(t.status || '').toLowerCase();
      if (['done', 'completed', 'paid', 'ongoing', 'session_inprocess'].includes(st)) {
        totalGrossSales += Number(t.amount || 0);
        totalCompletedSessions += 1;
      }
    });

    const mdrFee = Math.round(totalGrossSales * 0.007);
    const netSales = totalGrossSales - mdrFee;
    const netPayout = Math.round(netSales * 0.95);

    return NextResponse.json(
      {
        success: true,
        tickets: tickets || [],
        summary: {
          totalTickets: totalCount,
          completedSessions: totalCompletedSessions,
          grossSales: totalGrossSales,
          netSales,
          netPayout,
        },
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[API Tickets GET] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message, tickets: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
