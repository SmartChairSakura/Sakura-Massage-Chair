import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const MAX_FIRMWARE_BYTES = 1_572_864; // 1.5 MB ESP32 OTA partition limit
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

/**
 * POST /api/admin/chairs/firmware/upload
 * Multi-part upload handler for ESP32 compiled binary (.bin) files
 * Validates SemVer, max size (1.5 MB), SHA-256 checksum, and rollout strategy (canary | staged | all)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Defense-in-depth admin session check
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin credentials required to deploy firmware.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const version = String(formData.get('version') || '').trim();
    const targetChairId = String(formData.get('chair_id') || '').trim();
    const targetChairIdsRaw = String(formData.get('chair_ids') || '').trim();
    const strategy = String(formData.get('strategy') || 'canary').trim().toLowerCase();
    const releaseNotes = String(formData.get('notes') || '').trim();
    const scheduleWindow = String(formData.get('schedule_window') || 'standby').trim();

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No firmware binary (.bin) file provided.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.bin')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Only compiled ESP32 binary files (.bin) are accepted.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FIRMWARE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Firmware binary size (${(file.size / 1024).toFixed(1)} KB) exceeds the 1.5 MB ESP32 OTA partition limit.`,
        },
        { status: 400 }
      );
    }

    if (!version || !SEMVER_REGEX.test(version)) {
      return NextResponse.json(
        { success: false, error: 'Valid semantic version (MAJOR.MINOR.PATCH, e.g. 2.2.0) is required.' },
        { status: 400 }
      );
    }

    if (!targetChairId && !targetChairIdsRaw) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one target chair for OTA deployment.' },
        { status: 400 }
      );
    }

    // 2. Compute SHA-256 checksum & format safe filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const safeVer = version.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filename = `smart_chair_firmware_${safeVer}_${timestamp}.bin`;

    // 3. Upload directly to Supabase Public Cloud Storage ('firmware' bucket)
    let firmwareUrl = '';
    try {
      let { error: storageErr } = await supabaseServer.storage
        .from('firmware')
        .upload(filename, buffer, {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      if (storageErr && (storageErr.message?.toLowerCase().includes('not found') || storageErr.message?.toLowerCase().includes('bucket'))) {
        await supabaseServer.storage.createBucket('firmware', { public: true });
        const retry = await supabaseServer.storage
          .from('firmware')
          .upload(filename, buffer, {
            contentType: 'application/octet-stream',
            upsert: true,
          });
        storageErr = retry.error;
      }

      if (storageErr) {
        console.error('[Firmware Upload] Supabase Storage upload error:', storageErr);
        return NextResponse.json(
          { success: false, error: `Cloud storage upload error: ${storageErr.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseServer.storage
        .from('firmware')
        .getPublicUrl(filename);

      firmwareUrl = publicUrlData?.publicUrl || '';
    } catch (sErr: any) {
      console.error('[Firmware Upload] Storage exception:', sErr);
      return NextResponse.json(
        { success: false, error: `Failed to upload firmware to cloud storage: ${sErr?.message}` },
        { status: 500 }
      );
    }

    if (!firmwareUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate public URL for firmware binary.' },
        { status: 500 }
      );
    }

    // Optional local caching in dev environment only (non-fatal on read-only serverless filesystem)
    try {
      const publicFirmwareDir = path.join(process.cwd(), 'public', 'firmware');
      await fs.mkdir(publicFirmwareDir, { recursive: true });
      await fs.writeFile(path.join(publicFirmwareDir, filename), buffer);
    } catch {
      // Safely ignore on serverless environments like Vercel
    }

    // 4. Resolve targeted chair(s) and apply rollout strategy (canary | staged | all)
    let candidateQuery = supabaseServer
      .from('chairs')
      .select('id, chair_code, name, status, firmware_version')
      .is('deleted_at', null);

    const parsedIds = targetChairIdsRaw
      ? targetChairIdsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (parsedIds.length > 0) {
      candidateQuery = candidateQuery.in('chair_code', parsedIds);
    } else if (targetChairId && targetChairId !== 'ALL') {
      candidateQuery = candidateQuery.or(`id.eq.${targetChairId},chair_code.eq.${targetChairId}`);
    } else {
      candidateQuery = candidateQuery.eq('is_active', true);
    }

    const { data: candidateChairs, error: fetchErr } = await candidateQuery.order('id', { ascending: true });
    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: `Failed to query target chairs: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    const candidates = candidateChairs || [];
    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active matching chairs found for the selected deployment target.' },
        { status: 400 }
      );
    }

    // Verify new version is strictly higher than the lowest installed version in target set
    const installedVersions = candidates
      .map((c: any) => String(c.firmware_version || '2.1.0').trim())
      .filter((v: string) => SEMVER_REGEX.test(v));
    if (installedVersions.length > 0) {
      const minInstalled = installedVersions.reduce((min, cur) =>
        compareSemver(cur, min) < 0 ? cur : min
      );
      if (compareSemver(version, minInstalled) <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Version ${version} must be higher than currently installed version (${minInstalled}).`,
          },
          { status: 400 }
        );
      }
    }

    // Slice according to rollout strategy
    let finalTargets = candidates;
    if (strategy === 'canary') {
      finalTargets = candidates.slice(0, 1);
    } else if (strategy === 'staged') {
      const count = Math.max(1, Math.ceil(candidates.length * 0.1));
      finalTargets = candidates.slice(0, count);
    }

    const finalCodes = finalTargets.map((c: any) => c.chair_code);
    const now = new Date().toISOString();

    const { data: updatedChairs, error: dbErr } = await supabaseServer
      .from('chairs')
      .update({
        target_firmware_version: version,
        firmware_url: firmwareUrl,
        ota_status: 'PENDING',
        updated_at: now,
      })
      .in('chair_code', finalCodes)
      .select('id, chair_code, name, status, firmware_version, target_firmware_version, ota_status');

    if (dbErr) {
      console.error('[Firmware Upload] Database update error:', dbErr);
      return NextResponse.json(
        { success: false, error: `Firmware uploaded, but failed to update chair records: ${dbErr.message}` },
        { status: 500 }
      );
    }

    console.info('[Audit Log] Firmware OTA deployed:', {
      actor: session.email || session.name || 'admin',
      version,
      strategy,
      schedule_window: scheduleWindow,
      sha256,
      file_size_bytes: buffer.length,
      target_count: finalCodes.length,
      target_codes: finalCodes,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      message: `Firmware ${version} queued for ${finalCodes.length} ${finalCodes.length === 1 ? 'chair' : 'chairs'} (${strategy}).`,
      firmware_url: firmwareUrl,
      target_version: version,
      strategy,
      schedule_window: scheduleWindow,
      sha256,
      file_size_bytes: buffer.length,
      affected_chairs: updatedChairs || [],
      release_notes: releaseNotes,
      deployed_at: now,
    });
  } catch (err: any) {
    console.error('[Firmware Upload] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
