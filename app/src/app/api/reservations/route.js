import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

// Client for public insert (using service key to bypass RLS)
const serviceClient = createClient(supabaseUrl, serviceKey);

// Client for checking user token
const authClient = createClient(supabaseUrl, anonKey);

function getAuthClient(token) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// GET reservations (admin — requires auth)
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify token
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const date = searchParams.get('date');

  let query = getAuthClient(token)
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (date) query = query.eq('date', date);
  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST create reservation (public)
export async function POST(request) {
  const body = await request.json();

  const { data, error } = await serviceClient
    .from('reservations')
    .insert({
      full_name: body.full_name,
      phone: body.phone,
      email: body.email || '',
      guests: body.guests || 2,
      date: body.date,
      time: body.time,
      branch: body.branch || '',
      note: body.note || '',
      status: 'pending',
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email notification (fire and forget)
  try {
    const settingsRes = await serviceClient
      .from('site_settings')
      .select('value')
      .eq('key', 'notification_email')
      .single();

    if (settingsRes.data?.value) {
      // Email will be handled by edge function or external service
      console.log(`[Reservation] New booking from ${body.full_name} — notify ${settingsRes.data.value}`);
    }
  } catch (e) {
    console.error('Failed to get notification email:', e);
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH update reservation status (admin)
export async function PATCH(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify token
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, status } = body;

  if (!['pending', 'confirmed', 'cancelled', 'arrived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await getAuthClient(token)
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT update reservation (admin edit all fields)
export async function PUT(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...updateData } = body;

  const { data, error } = await getAuthClient(token)
    .from('reservations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE reservation (admin)
export async function DELETE(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { error, count } = await getAuthClient(token)
    .from('reservations')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (count === 0) return NextResponse.json({ error: 'Reservation not found or RLS blocked delete' }, { status: 403 });
  return NextResponse.json({ success: true });
}
