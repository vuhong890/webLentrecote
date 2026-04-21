import { createClient } from '@supabase/supabase-js';
import GalleryClient from './GalleryClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

export const metadata = {
  title: "Gallery | L'Entrecôte",
  description: "A visual journey through the exquisite dishes, warm ambiance, and timeless moments at L'Entrecôte.",
};

export default async function Gallery() {
  const [
    { data: pageData },
    { data: images }
  ] = await Promise.all([
    supabase.from('page_sections').select('*').eq('page', 'gallery').order('sort_order'),
    supabase.from('gallery_images').select('*').order('sort_order')
  ]);

  const ps = {};
  (Array.isArray(pageData) ? pageData : []).forEach(s => { ps[s.section_key] = s; });

  return (
    <GalleryClient 
      initialPageSections={ps}
      initialImages={images || []}
    />
  );
}
