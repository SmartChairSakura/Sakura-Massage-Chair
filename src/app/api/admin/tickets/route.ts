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
      .select('*, chair_slip_payments(*)', { count: 'exact' })
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

    // 4. Resolve location and chair metadata for clear display
    const [{ data: chairsList }, { data: locationsList }] = await Promise.all([
      supabaseServer.from('chairs').select('chair_code, location_name, location_id'),
      supabaseServer.from('locations').select('id, name, location_code'),
    ]);

    const locMap = new Map<string, { name: string; code: string }>();
    (locationsList || []).forEach((l: any) => {
      locMap.set(String(l.id), { name: l.name || '', code: l.location_code || '' });
    });

    const chairMap = new Map<string, { locationName: string; locationCode: string }>();
    (chairsList || []).forEach((c: any) => {
      const locInfo = locMap.get(String(c.location_id));
      chairMap.set(String(c.chair_code || '').toUpperCase(), {
        locationName: locInfo?.name || c.location_name || '',
        locationCode: locInfo?.code || '',
      });
    });

    const enrichedTickets = (tickets || []).map((tx: any) => {
      const codeKey = String(tx.chair_code || tx.chair_id || '').toUpperCase();
      const locFromChair = chairMap.get(codeKey);
      const locFromSlip = tx.location_id ? locMap.get(String(tx.location_id)) : null;

      const locationName = locFromChair?.locationName || locFromSlip?.name || tx.location_name || 'Grand Indonesia';
      const locationCode = locFromChair?.locationCode || locFromSlip?.code || tx.location_code || 'GI-01';

      const isPaid = ['done', 'completed', 'paid', 'ongoing', 'session_inprocess'].includes(String(tx.status || '').toLowerCase());
      const grossSales = Number(tx.amount || 0);

      const payment = Array.isArray(tx.chair_slip_payments) && tx.chair_slip_payments.length > 0
        ? tx.chair_slip_payments[0]
        : null;

      const mdrFee = isPaid ? (payment?.mdr_fee != null ? Number(payment.mdr_fee) : Math.round(grossSales * 0.007)) : 0;
      const netGross = isPaid ? (grossSales - mdrFee) : 0;
      const platformFee = isPaid ? (payment?.dev_share != null ? Number(payment.dev_share) : Math.round(netGross * 0.05)) : 0;
      const netPayout = isPaid ? (payment?.owner_net != null ? Number(payment.owner_net) : (grossSales - mdrFee - platformFee)) : 0;
      const paymentStatus = payment?.payment_status || (isPaid ? 'SETTLEMENT' : String(tx.status || 'PENDING').toUpperCase());
      const pgRefNumber = payment?.pg_ref_number || tx.chair_slip_number || tx.id;

      return {
        ...tx,
        location_name: locationName,
        location_code: locationCode,
        gross_sales: grossSales,
        mdr_fee: mdrFee,
        platform_fee: platformFee,
        net_payout: netPayout,
        payment_status: paymentStatus,
        pg_ref_number: pgRefNumber,
      };
    });

    // 5. Compute accurate KPI summary metrics across ALL matching tickets
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
    const platformFee = Math.round(netSales * 0.05);
    const netPayout = netSales - platformFee;

    return NextResponse.json(
      {
        success: true,
        tickets: enrichedTickets,
        summary: {
          totalTickets: totalCount,
          completedSessions: totalCompletedSessions,
          grossSales: totalGrossSales,
          mdrFee,
          netSales,
          platformFee,
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
