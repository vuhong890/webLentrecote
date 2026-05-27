import { getSupabase } from '@/lib/supabase-server';
import ContactClient from './ContactClient';

const supabase = getSupabase();

export const revalidate = 60;

export const metadata = {
  title: "Contact | L'Entrecôte",
  description: "Get in touch with L'Entrecôte for reservations, private events, and general inquiries.",
};

export default async function Contact() {
  const { data: pageData } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page', 'contact')
    .order('sort_order');

  const ps = {};
  (Array.isArray(pageData) ? pageData : []).forEach(s => { ps[s.section_key] = s; });

  return (
    <ContactClient initialPageSections={ps} />
  );
}
