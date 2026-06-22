const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('page_sections')
    .select('id, section_key, sort_order')
    .eq('page', 'home')
    .order('sort_order');
    
  console.log(data);
  
  // Find cta_banner
  const cta = data.find(s => s.section_key === 'cta_banner');
  if (cta) {
    await supabase.from('page_sections').update({ sort_order: cta.sort_order + 5 }).eq('section_key', 'testimonials');
    console.log('Updated testimonials to be after cta_banner', cta.sort_order + 5);
  }
}
run();
