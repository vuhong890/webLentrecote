import { getSupabase } from '@/lib/supabase-server';
import HeritageClient from './HeritageClient';

export const revalidate = 60;

export const metadata = {
  title: "Heritage | L'Entrecôte",
  description: "Discover the rich heritage of L'Entrecôte — from Paris 1959 to Saigon's vibrant dining scene.",
};

export default async function Heritage() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page', 'heritage')
    .order('sort_order');

  const sections = {};
  (data || []).forEach(s => { sections[s.section_key] = s; });

  return <HeritageClient initialSections={sections} />;
}
