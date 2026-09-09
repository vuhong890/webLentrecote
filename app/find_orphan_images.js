const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findOrphanImages() {
  console.log('Fetching all used URLs from database...');
  const usedUrls = new Set();

  // 1. Fetch site_settings
  const { data: settings } = await supabase.from('site_settings').select('value');
  if (settings) {
    settings.forEach(s => {
      if (s.value && s.value.includes('supabase.co/storage')) {
        usedUrls.add(s.value);
      }
    });
  }

  // Helper to fetch urls from a table
  const fetchUrls = async (table, column) => {
    const { data } = await supabase.from(table).select(column);
    if (data) {
      data.forEach(row => {
        if (row[column]) {
          usedUrls.add(row[column]);
        }
      });
    }
  };

  await fetchUrls('menu_items', 'image_url');
  await fetchUrls('menu_categories', 'image_url');
  await fetchUrls('gallery', 'image_url');
  await fetchUrls('home_gallery', 'image_url');
  await fetchUrls('signature_items', 'image_url');
  await fetchUrls('page_sections', 'image_url');

  console.log(`Found ${usedUrls.size} unique image URLs used in Database.`);

  // Function to list files in a bucket
  const listAllFiles = async (bucket) => {
    console.log(`\nChecking bucket: ${bucket}`);
    const { data: files, error } = await supabase.storage.from(bucket).list('', {
      limit: 1000,
      offset: 0,
    });
    
    if (error) {
      console.error(`Error listing bucket ${bucket}:`, error.message);
      return [];
    }

    const orphans = [];
    const used = [];
    
    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
      
      if (usedUrls.has(publicUrl)) {
        used.push(file);
      } else {
        orphans.push({ name: file.name, url: publicUrl, size: file.metadata?.size });
      }
    }
    
    console.log(`- Total files in ${bucket}: ${files.length}`);
    console.log(`- Used files: ${used.length}`);
    console.log(`- Orphan files: ${orphans.length}`);
    
    return orphans;
  };

  const buckets = ['menu-images', 'page-assets', 'gallery'];
  let totalOrphans = 0;
  let totalOrphanSize = 0;
  
  for (const bucket of buckets) {
    const orphans = await listAllFiles(bucket);
    totalOrphans += orphans.length;
    
    orphans.forEach(o => {
      totalOrphanSize += (o.size || 0);
      console.log(`  [ORPHAN] ${o.name} (${(o.size / 1024 / 1024).toFixed(2)} MB) - ${o.url}`);
    });
  }
  
  console.log(`\n=============================`);
  console.log(`Total orphan files found: ${totalOrphans}`);
  console.log(`Total space can be freed: ${(totalOrphanSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`=============================`);
}

findOrphanImages().catch(console.error);
