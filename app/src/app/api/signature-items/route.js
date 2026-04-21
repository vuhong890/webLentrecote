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

// GET — list active signature items, joined with menu_items when linked (public)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all'); // admin uses ?all=1 to get all items

  let query = supabase
    .from('signature_items')
    .select('*, menu_items(id, name_en, name_vi, description_en, description_vi, price, image_url, badge)')
    .order('display_order');

  if (!all) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge menu_items data into signature item when menu_item_id is set
  const merged = (data || []).map(item => {
    if (item.menu_items && item.menu_item_id) {
      const mi = item.menu_items;
      return {
        ...item,
        name_en: item.name_en || mi.name_en,
        name_vi: item.name_vi || mi.name_vi,
        description_en: item.description_en || mi.description_en,
        description_vi: item.description_vi || mi.description_vi,
        image_url: item.image_url || mi.image_url,
        price: mi.price,
        badge: mi.badge,
        menu_items: undefined,
      };
    }
    return { ...item, menu_items: undefined };
  });

  const headers = all ? {} : { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };
  return NextResponse.json(merged, { headers });
}

// POST — create (admin) — now accepts menu_item_id
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await authClient(token)
    .from('signature_items')
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT — update (admin)
export async function PUT(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  const { data, error } = await authClient(token)
    .from('signature_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — delete (admin)
export async function DELETE(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  const { error } = await authClient(token)
    .from('signature_items')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
