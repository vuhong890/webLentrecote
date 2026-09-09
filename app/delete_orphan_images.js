const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We must use service role key to delete files
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanOrphanImages() {
  console.log('Fetching all used URLs from database...');
  const usedUrls = new Set();

  const { data: settings } = await supabase.from('site_settings').select('value');
  if (settings) {
    settings.forEach(s => {
      if (s.value && s.value.includes('supabase.co/storage')) usedUrls.add(s.value);
    });
  }

  const fetchUrls = async (table, column) => {
    const { data } = await supabase.from(table).select(column);
    if (data) {
      data.forEach(row => {
        if (row[column]) usedUrls.add(row[column]);
      });
    }
  };

  await fetchUrls('menu_items', 'image_url');
  await fetchUrls('menu_categories', 'image_url');
  await fetchUrls('gallery', 'image_url');
  await fetchUrls('home_gallery', 'image_url');
  await fetchUrls('signature_items', 'image_url');
  await fetchUrls('page_sections', 'image_url');

  const processBucket = async (bucket) => {
    console.log(`\nProcessing bucket: ${bucket}`);
    const { data: files, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
    
    if (error) return;

    const filesToDelete = [];
    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
      if (!usedUrls.has(publicUrl)) {
        filesToDelete.push(file.name);
      }
    }
    
    if (filesToDelete.length > 0) {
      console.log(`Deleting ${filesToDelete.length} files from ${bucket}...`);
      const { data, error: delError } = await supabase.storage.from(bucket).remove(filesToDelete);
      if (delError) console.error(`Failed to delete from ${bucket}:`, delError.message);
      else console.log(`Successfully deleted ${data.length} files from ${bucket}.`);
    } else {
      console.log(`No orphan files to delete in ${bucket}.`);
    }
  };

  await processBucket('menu-images');
  await processBucket('page-assets');
  await processBucket('gallery');
  
  console.log('\nCleanup complete!');
}

cleanOrphanImages().catch(console.error);
