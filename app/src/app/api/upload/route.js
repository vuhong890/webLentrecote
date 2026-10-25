import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST upload file to Supabase Storage
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'menu-images';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const rawExt = file.name ? file.name.split('.').pop().toLowerCase() : 'webp';
    const ext = (rawExt === 'blob' || !rawExt) ? 'webp' : rawExt;
    const contentType = file.type || (ext === 'webp' ? 'image/webp' : 'image/jpeg');

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await authClient.storage
      .from(bucket)
      .upload(filename, rawBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get public URL
    const { data: urlData } = authClient.storage.from(bucket).getPublicUrl(data.path);

    return NextResponse.json({
      path: data.path,
      url: urlData.publicUrl,
    });
  } catch (err) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
