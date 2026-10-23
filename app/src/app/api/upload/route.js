import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// POST upload file to Supabase Storage
export async function POST(request) {
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
  let uploadBuffer = rawBuffer;
  let uploadContentType = file.type || 'image/jpeg';
  let finalExt = 'webp';

  try {
    const isMenu = bucket === 'menu-images';
    const maxWidth = isMenu ? 800 : 1600;
    const maxHeight = isMenu ? 800 : 1200;

    uploadBuffer = await sharp(rawBuffer)
      .rotate() // auto-orient based on EXIF
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    uploadContentType = 'image/webp';
    finalExt = 'webp';
  } catch (err) {
    console.warn('Sharp compression error, falling back to original:', err.message);
    const rawExt = file.name ? file.name.split('.').pop() : 'png';
    finalExt = rawExt === 'blob' ? 'png' : rawExt;
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;

  const { data, error } = await authClient.storage
    .from(bucket)
    .upload(filename, uploadBuffer, {
      contentType: uploadContentType,
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
}
