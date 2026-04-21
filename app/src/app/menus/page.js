import { createClient } from '@supabase/supabase-js';
import MenusClient from './MenusClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

export const metadata = {
  title: "Menus | L'Entrecôte",
  description: "Explore our legendary menu featuring the signature entrecôte steak, golden frites, and fine wines.",
};

export default async function Menus() {
  const [
    { data: pageData },
    { data: categories },
    { data: menuItems }
  ] = await Promise.all([
    supabase.from('page_sections').select('*').eq('page', 'menus').order('sort_order'),
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase.from('menu_items').select('*, menu_categories(name_en, name_vi, slug)').order('sort_order')
  ]);

  const ps = {};
  (Array.isArray(pageData) ? pageData : []).forEach(s => { ps[s.section_key] = s; });

  return (
    <MenusClient 
      pageSections={ps}
      initialCategories={categories || []}
      allMenuItems={menuItems || []}
    />
  );
}
