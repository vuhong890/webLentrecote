import { getSupabase } from '@/lib/supabase-server';
import ReservationClient from './ReservationClient';

const supabase = getSupabase();

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
