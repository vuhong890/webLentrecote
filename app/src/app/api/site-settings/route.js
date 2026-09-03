import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
  
  return NextResponse.json(settings);
}

// PUT update setting
export async function PUT(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service role key to bypass RLS, but we still required a token above for security
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey);

  const body = await request.json(); // { key: 'notification_email', value: 'new@email.com' }

  const { data, error } = await serviceClient
    .from('site_settings')
    .upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();
    
  if (error) {
    console.error('Settings Upsert Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  revalidatePath('/', 'layout');
  return NextResponse.json(data);
}
