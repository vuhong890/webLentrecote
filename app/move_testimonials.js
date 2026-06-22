const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  try {
    const { data, error } = await supabase
      .from('page_sections')
      .update({ page: 'home' })
      .eq('section_key', 'testimonials')
      .eq('page', 'reservation');

    if (error) throw error;
    console.log('Moved testimonials to home page');
  } catch (e) {
    console.error(e);
  }
}

run();
