import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword } from '@/lib/auth-server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Super Admin yang dapat mengakses.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    let query = supabaseServer
      .from('admin_users')
      .select(`
        id,
        email,
        username,
        phone_number,
        full_name,
        role,
        location_id,
        is_active,
        last_login_at,
        created_at,
        locations ( id, name, location_code )
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('[API Users GET] DB Error:', error);
      return NextResponse.json({ success: false, error: 'Gagal mengambil data user.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: users || [] });
  } catch (err: any) {
    console.error('[API Users GET] Server Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Super Admin yang dapat membuat user baru.' }, { status: 403 });
    }

    const body = await req.json();
    const { full_name, email, username, phone_number, password, role, location_id } = body;

    const cleanName = String(full_name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanUsername = String(username || cleanEmail.split('@')[0] || '').trim().toLowerCase();
    const cleanPhone = String(phone_number || '').trim();
    const cleanPass = String(password || '').trim();
    const cleanRole = (role === 'OWNER' ? 'OWNER' : 'SUPER_ADMIN') as 'SUPER_ADMIN' | 'OWNER';
    const locId = location_id ? String(location_id) : null;

    if (!cleanName || !cleanEmail || !cleanPass) {
      return NextResponse.json({ success: false, error: 'Nama Lengkap, Email, dan Password wajib diisi.' }, { status: 400 });
    }

    if (cleanPass.length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    if (cleanRole === 'OWNER' && !locId) {
      return NextResponse.json({ success: false, error: 'Role OWNER wajib memilih Cabang Lokasi.' }, { status: 400 });
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseServer
      .from('admin_users')
      .select('id')
      .or(`email.eq.${cleanEmail},username.eq.${cleanUsername}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email atau Username sudah terdaftar.' }, { status: 409 });
    }

    // Hash password with bcrypt
    const password_hash = await hashPassword(cleanPass);

    // Insert user into DB
    const { data: newUser, error: insertError } = await supabaseServer
      .from('admin_users')
      .insert({
        full_name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        phone_number: cleanPhone,
        password_hash,
        role: cleanRole,
        location_id: locId,
        is_active: true,
      })
      .select('id, email, username, full_name, role, location_id, is_active, created_at')
      .single();

    if (insertError) {
      console.error('[API Users POST] Insert Error:', insertError);
      return NextResponse.json({ success: false, error: `Gagal membuat user baru: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${cleanName} (${cleanRole}) berhasil dibuat.`,
      user: newUser,
    });
  } catch (err: any) {
    console.error('[API Users POST] Server Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, full_name, phone_number, role, location_id, is_active, new_password } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID User wajib diisi.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updatePayload.full_name = String(full_name).trim();
    if (phone_number !== undefined) updatePayload.phone_number = String(phone_number).trim();
    if (role !== undefined) updatePayload.role = role === 'OWNER' ? 'OWNER' : 'SUPER_ADMIN';
    if (location_id !== undefined) updatePayload.location_id = location_id ? String(location_id) : null;
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    if (new_password) {
      const cleanPass = String(new_password).trim();
      if (cleanPass.length < 6) {
        return NextResponse.json({ success: false, error: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }
      updatePayload.password_hash = await hashPassword(cleanPass);
    }

    const { error: updateError } = await supabaseServer
      .from('admin_users')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error('[API Users PATCH] DB Update Error:', updateError);
      return NextResponse.json({ success: false, error: 'Gagal memperbarui user.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
  } catch (err: any) {
    console.error('[API Users PATCH] Server Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'ID User wajib diisi.' }, { status: 400 });
    }

    // Toggle active status to false
    const { error: deleteError } = await supabaseServer
      .from('admin_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (deleteError) {
      console.error('[API Users DELETE] DB Error:', deleteError);
      return NextResponse.json({ success: false, error: 'Gagal menonaktifkan user.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User berhasil dinonaktifkan.' });
  } catch (err: any) {
    console.error('[API Users DELETE] Server Error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
