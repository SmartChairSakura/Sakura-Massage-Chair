import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAdminSession } from '@/lib/auth-server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/chairs/firmware/upload
 * Multi-part upload handler for ESP32 compiled binary (.bin) files
 * Stores binary to public storage and deploys OTA update command to targeted chairs in Supabase
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
    const targetChairId = String(formData.get('chair_id') || 'ALL').trim();
    const releaseNotes = String(formData.get('notes') || '').trim();

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

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Firmware version string (e.g. 2.2.0) is required.' },
        { status: 400 }
      );
    }

    // 2. Format safe filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

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
        // Auto-create bucket if missing
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

    // 4. Update targeted chair(s) in Supabase database
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      target_firmware_version: version,
      firmware_url: firmwareUrl,
      ota_status: 'PENDING',
      updated_at: now,
    };

    let chairsQuery = supabaseServer.from('chairs').update(updatePayload);

    if (targetChairId !== 'ALL') {
      chairsQuery = chairsQuery.eq('id', targetChairId);
    } else {
      chairsQuery = chairsQuery.eq('is_active', true);
    }

    const { data: updatedChairs, error: dbErr } = await chairsQuery.select('id, chair_code, name, status, firmware_version');

    if (dbErr) {
      console.error('[Firmware Upload] Database update error:', dbErr);
      return NextResponse.json(
        { success: false, error: `Firmware uploaded, but failed to update chair records: ${dbErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Firmware ${version} deployed successfully to ${targetChairId === 'ALL' ? 'all active chairs' : targetChairId}.`,
      firmware_url: firmwareUrl,
      target_version: version,
      target_chair: targetChairId,
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
