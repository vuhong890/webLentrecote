import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function authClient(token) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// GET reservations (admin — requires auth)
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const date = searchParams.get('date');

  let query = authClient(token)
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

  const { data, error } = await supabase
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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email notification (fire and forget)
  try {
    const settingsRes = await supabase
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

  const body = await request.json();
  const { id, status } = body;

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await authClient(token)
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
