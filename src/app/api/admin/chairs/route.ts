import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';
import crypto from 'crypto';

function generateRandomPin(): string {
  const weakPins = new Set(['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '654321']);
  let candidate = '123456';
  while (weakPins.has(candidate)) {
    const num = crypto.randomInt(100000, 999999);
    candidate = String(num);
  }
  return candidate;
}

function normalizeUnitName(name: string | null | undefined): string {
  return String(name || '').replace(/\bStagging IoT\b/gi, 'Staging IoT').trim();
}

// GET: Fetch chairs from DB with masked Terminal PIN (never expose raw PIN in list response)
export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', chairs: [] }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    const startTime = Date.now();
    let query = supabaseServer.from('chairs').select('*');
    if (!includeArchived) {
      query = query.is('deleted_at', null);
    }

    const { data: chairs, error } = await query.order('id', { ascending: true });

    if (error) {
      console.error('[API Chairs GET] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message, chairs: [] }, { status: 500 });
    }

    // Mask plaintext PIN and sort naturally by chair_code
    const safeChairs = (chairs || [])
      .map((c: any) => {
        const { pin: rawPin, ...rest } = c;
        const effectivePin = String(rawPin || '123456').trim();
        return {
          ...rest,
          chair_code: c.chair_code || String(c.id),
          name: normalizeUnitName(c.name),
          model_type: c.model_type || 'Tokuyo TC-355',
          pin_masked: '••••••',
          has_default_pin: effectivePin === '123456',
          status: c.status || 'ONLINE',
        };
      })
      .sort((a: any, b: any) =>
        String(a.chair_code).localeCompare(String(b.chair_code), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );

    return NextResponse.json({
      success: true,
      chairs: safeChairs,
      telemetry: { totalChairs: safeChairs.length, durationMs: Date.now() - startTime },
    });
  } catch (err: any) {
    console.error('[API Chairs GET] Exception:', err);
    return NextResponse.json({ success: false, error: err.message, chairs: [] }, { status: 500 });
  }
}

// POST: Register new chair, Audited PIN Reveal, or EDC Login verification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, chair_code, name, model_type, location_id, location_name, pin } = body;
    const inputCode = String(chair_code || id || '').trim().toUpperCase();

    // === 1. LOGIN / PAIRING EDC ===
    if (action === 'LOGIN') {
      const cleanPin = String(pin || '').trim();
      if (!inputCode || !cleanPin) {
        return NextResponse.json({ success: false, error: 'Chair code and PIN are required.' }, { status: 400 });
      }

      const { data: chair, error } = await supabaseServer
        .from('chairs')
        .select('*')
        .eq('chair_code', inputCode)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[API Chairs LOGIN] DB error:', error.message);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
      }
      if (!chair) {
        return NextResponse.json({ success: false, error: `Chair code '${inputCode}' was not found.` }, { status: 404 });
      }

      const validPin = chair.pin || '123456';
      if (cleanPin !== validPin) {
        return NextResponse.json({ success: false, error: 'Invalid PIN password.' }, { status: 401 });
      }

      const { pin: _omitPin, ...safeChair } = chair;
      return NextResponse.json({ success: true, chair: safeChair });
    }

    // Require admin session for all backoffice mutations & PIN reveals
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // === 2. AUDITED TERMINAL PIN REVEAL ===
    if (action === 'REVEAL_PIN') {
      if (!inputCode) {
        return NextResponse.json({ success: false, error: 'Chair code is required to reveal PIN.' }, { status: 400 });
      }

      const { data: chair, error } = await supabaseServer
        .from('chairs')
        .select('id, chair_code, name, pin')
        .eq('chair_code', inputCode)
        .maybeSingle();

      if (error || !chair) {
        return NextResponse.json({ success: false, error: 'Chair not found.' }, { status: 404 });
      }

      const revealedAt = new Date().toISOString();
      const actor = session.email || session.name || 'admin';
      console.info('[Audit Log] Terminal PIN explicitly revealed:', {
        actor,
        chair_code: chair.chair_code,
        timestamp: revealedAt,
      });

      return NextResponse.json({
        success: true,
        chair_code: chair.chair_code,
        pin: String(chair.pin || '123456'),
        has_default_pin: String(chair.pin || '123456') === '123456',
        audited_by: actor,
        revealed_at: revealedAt,
      });
    }

    // === 3. REGISTER NEW CHAIR ===
    const cleanName = normalizeUnitName(name);
    const cleanModelType = String(model_type || 'Tokuyo TC-355').trim();
    const cleanLocation = String(location_name || '').trim();
    const rawPin = String(pin || '').replace(/\D/g, '').slice(0, 6);
    const cleanPin = rawPin.length === 6 ? rawPin : generateRandomPin();

    if (!inputCode || !cleanName || !cleanLocation) {
      return NextResponse.json({ success: false, error: 'Chair code, name, and location are required.' }, { status: 400 });
    }

    const upsertPayload: Record<string, any> = {
      chair_code: inputCode,
      name: cleanName,
      model_type: cleanModelType,
      location_name: cleanLocation,
      status: 'ONLINE',
      is_active: true,
      pin: cleanPin,
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    if (location_id) {
      upsertPayload.location_id = String(location_id).trim();
    }

    const { data, error } = await supabaseServer
      .from('chairs')
      .upsert(upsertPayload, { onConflict: 'chair_code' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Chairs POST] DB upsert error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { pin: _savedPin, ...safeChair } = data || {};
    return NextResponse.json({
      success: true,
      db_synced: true,
      message: 'Chair successfully saved.',
      chair: {
        ...safeChair,
        pin_masked: '••••••',
        has_default_pin: cleanPin === '123456',
      },
      generated_pin: cleanPin,
    });
  } catch (err: any) {
    console.error('[API Chairs POST] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Soft-archive a chair by chair_code (or permanent delete if confirmed & unused)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chairCode = searchParams.get('id') || searchParams.get('chair_code');

    if (!chairCode) {
      return NextResponse.json({ success: false, error: 'Chair code parameter is required.' }, { status: 400 });
    }

    const targetCode = chairCode.trim();
    const { error } = await supabaseServer
      .from('chairs')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('chair_code', targetCode);

    if (error) {
      console.error('[API Chairs DELETE] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.info('[Audit Log] Chair archived:', {
      actor: session.email || session.name || 'admin',
      chair_code: targetCode,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: `Chair '${targetCode}' archived successfully.` });
  } catch (err: any) {
    console.error('[API Chairs DELETE] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update an existing chair, restore archive, or cancel/rollback OTA
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      action,
      id,
      chair_code,
      name,
      model_type,
      location_id,
      location_name,
      pin,
      status,
      deleted_at,
      is_active,
      rollback_version,
    } = body;
    const targetCode = String(chair_code || id || '').trim().toUpperCase();

    if (!targetCode) {
      return NextResponse.json({ success: false, error: 'Chair code or ID is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const actor = session.email || session.name || 'admin';

    // === 1. CANCEL PENDING OTA ===
    if (action === 'CANCEL_OTA') {
      const { data, error } = await supabaseServer
        .from('chairs')
        .update({
          ota_status: 'IDLE',
          target_firmware_version: null,
          updated_at: now,
        })
        .eq('chair_code', targetCode)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      console.info('[Audit Log] OTA deployment cancelled:', { actor, chair_code: targetCode, timestamp: now });
      const { pin: _p, ...safeData } = data || {};
      return NextResponse.json({
        success: true,
        message: `Pending OTA update cancelled for ${targetCode}.`,
        chair: safeData,
      });
    }

    // === 2. ROLLBACK OTA FIRMWARE ===
    if (action === 'ROLLBACK_OTA') {
      const targetVer = String(rollback_version || '2.1.0').trim();
      const { data, error } = await supabaseServer
        .from('chairs')
        .update({
          target_firmware_version: targetVer,
          ota_status: 'PENDING',
          updated_at: now,
        })
        .eq('chair_code', targetCode)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      console.info('[Audit Log] OTA rollback queued:', {
        actor,
        chair_code: targetCode,
        rollback_to: targetVer,
        timestamp: now,
      });
      const { pin: _p, ...safeData } = data || {};
      return NextResponse.json({
        success: true,
        message: `Rollback to v${targetVer} queued for ${targetCode}.`,
        chair: safeData,
      });
    }

    // === 3. GENERAL UPDATE & ARCHIVE RESTORE ===
    const updateData: Record<string, any> = {
      updated_at: now,
    };

    if (name !== undefined) updateData.name = normalizeUnitName(name);
    if (model_type !== undefined) updateData.model_type = String(model_type).trim();
    if (location_id !== undefined) updateData.location_id = String(location_id).trim();
    if (location_name !== undefined) updateData.location_name = String(location_name).trim();
    if (status !== undefined) updateData.status = String(status).trim();
    if (deleted_at !== undefined) updateData.deleted_at = deleted_at;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    if (pin !== undefined && String(pin).trim() !== '') {
      const cleanPin = String(pin).replace(/\D/g, '').slice(0, 6);
      if (cleanPin.length !== 6) {
        return NextResponse.json({ success: false, error: 'Terminal PIN must be a 6-digit number.' }, { status: 400 });
      }
      updateData.pin = cleanPin;
      console.info('[Audit Log] Terminal PIN updated:', { actor, chair_code: targetCode, timestamp: now });
    }

    const { data, error } = await supabaseServer
      .from('chairs')
      .update(updateData)
      .eq('chair_code', targetCode)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Chairs PATCH] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { pin: rawPin, ...safeChair } = data || {};
    return NextResponse.json({
      success: true,
      message: 'Chair updated successfully.',
      chair: {
        ...safeChair,
        pin_masked: '••••••',
        has_default_pin: String(rawPin || '123456') === '123456',
      },
    });
  } catch (err: any) {
    console.error('[API Chairs PATCH] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
