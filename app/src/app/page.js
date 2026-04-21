import { createClient } from '@supabase/supabase-js';
import HomeClient from './HomeClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Revalidate this page every 60 seconds (SSG with ISR)
export const revalidate = 60;

export default async function Home() {
  // Fetch data directly from Supabase
  const [
    { data: homeData },
    { data: heritageData },
    { data: sigDataRaw },
    { data: galleryData }
  ] = await Promise.all([
    supabase.from('page_sections').select('*').eq('page', 'home').order('sort_order'),
    supabase.from('page_sections').select('*').eq('page', 'heritage').order('sort_order'),
    supabase.from('signature_items').select('*, menu_items(id, name_en, name_vi, description_en, description_vi, price, image_url, badge)').eq('is_active', true).order('display_order'),
    supabase.from('home_gallery_picks').select('*, gallery_images(*)').order('display_order')
  ]);

  // Map home sections
  const hs = {};
  (Array.isArray(homeData) ? homeData : []).forEach(s => { hs[s.section_key] = s; });

  // Map heritage sections
  const hrs = {};
  (Array.isArray(heritageData) ? heritageData : []).forEach(s => { hrs[s.section_key] = s; });

  // Merge signature items
  const mergedSigData = (sigDataRaw || []).map(item => {
    if (item.menu_items && item.menu_item_id) {
      const mi = item.menu_items;
      return {
        ...item,
        name_en: item.name_en || mi.name_en,
        name_vi: item.name_vi || mi.name_vi,
        description_en: item.description_en || mi.description_en,
        description_vi: item.description_vi || mi.description_vi,
        image_url: item.image_url || mi.image_url,
        price: mi.price,
        badge: mi.badge,
        menu_items: undefined,
      };
    }
    return { ...item, menu_items: undefined };
  });

  return (
    <HomeClient 
      initialHomeSections={hs}
      initialHeritageSections={hrs}
      initialSignatureItems={mergedSigData}
      initialGalleryPicks={galleryData || []}
    />
  );
}
