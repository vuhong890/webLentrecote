import { createClient } from '@supabase/supabase-js';
import ReservationClient from './ReservationClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

export const metadata = {
  title: "Reservation | L'Entrecôte",
  description: "Secure your table at L'Entrecôte. An unforgettable dining experience awaits.",
};

export default async function Reservation() {
  const { data: pageData } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page', 'reservation')
    .order('sort_order');

  const ps = {};
  (Array.isArray(pageData) ? pageData : []).forEach(s => { ps[s.section_key] = s; });

  return (
    <ReservationClient initialPageSections={ps} />
  );
}
