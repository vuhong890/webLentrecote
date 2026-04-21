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

// GET all settings
export async function GET() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const settings = {};
  (data || []).forEach(item => {
    settings[item.key] = item.value;
  });
  
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}

// PUT update setting
export async function PUT(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json(); // { key: 'notification_email', value: 'new@email.com' }

  const { data, error } = await authClient(token)
    .from('site_settings')
    .update({ value: body.value, updated_at: new Date().toISOString() })
    .eq('key', body.key)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
