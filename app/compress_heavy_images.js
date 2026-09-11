const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key to overwrite files
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaHp3b2pwbm1yd2lta2Zxc2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2ODQ3OSwiZXhwIjoyMDg5OTQ0NDc5fQ.H0vH5hvF58BcVipUSY5lbvO1ZcKGAJ0lXHT_a6V3UM0';
const supabase = createClient(supabaseUrl, supabaseKey);

const imagesToCompress = [
  { bucket: 'page-assets', name: '1776304444353-o0c0x2av4bq.jpeg' },
  { bucket: 'page-assets', name: '1776305829572-5rwsy8kmjms.jpeg' },
  { bucket: 'menu-images', name: '1782834316911-445rc71vkts.webp' },
  { bucket: 'menu-images', name: '1782833872983-4zloi2ypn8.webp' },
  { bucket: 'menu-images', name: '1782831439994-rylgsor3wf8.webp' },
  { bucket: 'menu-images', name: '1782832515058-yh6tbddb63k.webp' },
  { bucket: 'menu-images', name: '1782833463180-usois6lky6.webp' }
];

async function run() {
  for (const item of imagesToCompress) {
    console.log(`Processing: ${item.bucket}/${item.name}`);
    
    // 1. Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage.from(item.bucket).download(item.name);
    
    if (downloadError) {
      console.error(`Error downloading ${item.name}:`, downloadError.message);
      continue;
    }
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`- Original size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 2. Compress the image using sharp
    // Convert all to WebP for maximum compression while maintaining quality
    let compressedBuffer;
    try {
      compressedBuffer = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true }) // Max width 1920px
        .webp({ quality: 80 }) // Compress to WebP
        .toBuffer();
    } catch (e) {
      console.error(`Error compressing ${item.name}:`, e.message);
      continue;
    }
    
    console.log(`- Compressed size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 3. Upload back to Supabase (overwrite)
    // We upload with upsert: true
    const { error: uploadError } = await supabase.storage
      .from(item.bucket)
      .upload(item.name, compressedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error(`Error uploading ${item.name}:`, uploadError.message);
    } else {
      console.log(`- Successfully compressed and replaced: ${item.name}\n`);
    }
  }
  console.log('All done!');
}

run();
