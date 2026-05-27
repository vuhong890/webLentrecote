import { getSupabase } from '@/lib/supabase-server';
import MenusClient from './MenusClient';

const supabase = getSupabase();

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
