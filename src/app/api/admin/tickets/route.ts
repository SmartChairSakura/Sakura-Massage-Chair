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

// Helper to apply common filter predicates to chair_slips queries
function applyTicketFilters(
  baseQuery: any,
  params: {
    locationId?: string | null;
    chairCodes?: string[];
    statusList?: string[] | null;
    startIso?: string | null;
    endIso?: string | null;
    search?: string | null;
    searchBy?: string;
    dateColumn?: 'created_at' | 'updated_at';
  }
) {
  let q = baseQuery;
  const {
    locationId,
    chairCodes,
    statusList,
    startIso,
    endIso,
    search,
    searchBy,
    dateColumn = 'created_at',
  } = params;

  if (locationId && locationId !== 'ALL') {
    if (chairCodes && chairCodes.length > 0) {
      q = q.or(`location_id.eq.${locationId},chair_code.in.(${chairCodes.join(',')}),chair_id.in.(${chairCodes.join(',')})`);
    } else {
      q = q.eq('location_id', locationId);
    }
  }

  if (statusList && statusList.length > 0) {
    q = q.in('status', statusList);
  }

  if (startIso) {
    q = q.gte(dateColumn, startIso);
  }
  if (endIso) {
    q = q.lte(dateColumn, endIso);
  }

  if (search && search.trim()) {
    const cleanSearch = search.trim();
    if (searchBy === 'TICKET_NUMBER') {
      q = q.ilike('chair_slip_number', `%${cleanSearch}%`);
    } else if (searchBy === 'CHAIR_CODE') {
      q = q.or(`chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`);
    } else {
      q = q.or(
        `chair_slip_number.ilike.%${cleanSearch}%,chair_code.ilike.%${cleanSearch}%,chair_id.ilike.%${cleanSearch}%`
      );
    }
  }

  return q;
}

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
    const dateType = searchParams.get('date_type') === 'settled_at' ? 'settled_at' : 'created_at';
    const dateColumn: 'created_at' | 'updated_at' = dateType === 'settled_at' ? 'updated_at' : 'created_at';
    const isExport = searchParams.get('export') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    // 1. Resolve location chair codes (single DB query for both main & summary queries)
    let chairCodes: string[] = [];
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

      chairCodes = (locChairs || []).map((c: any) => c.chair_code).filter(Boolean);
    }

    // 2. Parse status & date range filters
    const statusList = mapStatusFilter(status);
    const { startIso, endIso } = getWibDateRange(range, dateFrom, dateTo, timeFrom, timeTo);

    const filterParams = {
      locationId,
      chairCodes,
      statusList,
      startIso,
      endIso,
      search,
      searchBy,
      dateColumn,
    };

    // 3. Main query (unpaginated up to 10,000 rows if export=true, otherwise paginated)
    const baseQuery = supabaseServer
      .from('chair_slips')
      .select('*', { count: 'exact' })
      .order(dateColumn, { ascending: false });

    const query = isExport
      ? applyTicketFilters(baseQuery, filterParams).limit(10000)
      : applyTicketFilters(baseQuery, filterParams).range(offset, offset + limit - 1);

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

    // 4. Compute accurate KPI summary metrics across ALL matching tickets
    const summaryBaseQuery = supabaseServer.from('chair_slips').select('amount, status');
    const summaryQuery = applyTicketFilters(summaryBaseQuery, filterParams);

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
