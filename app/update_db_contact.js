const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sections = [
    {
      page: 'contact',
      section_key: 'hours',
      title_en: 'Opening Hours',
      title_vi: 'Giờ Mở Cửa',
      content_en: '<p><strong>Lunch:</strong> 11:30 AM – 2:00 PM</p><p><strong>Dinner:</strong> 4:00 PM – 11:00 PM</p><p><strong>Last order:</strong> 10:00 PM</p><p><em>Open daily</em></p>',
      content_vi: '<p><strong>Trưa:</strong> 11:30 Sáng – 2:00 Chiều</p><p><strong>Tối:</strong> 4:00 Chiều – 11:00 Tối</p><p><strong>Gọi món cuối:</strong> 10:00 Tối</p><p><em>Mở cửa mỗi ngày</em></p>',
      sort_order: 30
    },
    {
      page: 'contact',
      section_key: 'hotline',
      title_en: 'Hotline',
      title_vi: 'Hotline',
      content_en: '<p><a href="tel:+84327157002">(+84) 32 7157 002</a></p>',
      content_vi: '<p><a href="tel:+84327157002">(+84) 32 7157 002</a></p>',
      sort_order: 40
    },
    {
      page: 'contact',
      section_key: 'email',
      title_en: 'Email',
      title_vi: 'Email',
      content_en: '<p><a href="mailto:booking@lentrecotevietnam.com">booking@lentrecotevietnam.com</a></p>',
      content_vi: '<p><a href="mailto:booking@lentrecotevietnam.com">booking@lentrecotevietnam.com</a></p>',
      sort_order: 50
    }
  ];

  for (const s of sections) {
    const { data } = await supabase.from('page_sections').select('id').eq('page', s.page).eq('section_key', s.section_key);
    if (data && data.length > 0) {
      await supabase.from('page_sections').update(s).eq('id', data[0].id);
    } else {
      await supabase.from('page_sections').insert([s]);
    }
  }

  // Also fix the details section content_en and content_vi to not include the hours/hotline/email
  const detailsContentEn = `<p>Level 2, Dong Du, Saigon Ward, HCMC</p><p>Monday - Sunday</p><p>11:30 AM - 11:00 PM</p>`;
  const detailsContentVi = `<p>Tầng 2, Đồng Du, Phường Sài Gòn, TP. Hồ Chí Minh</p><p>Thứ Hai - Chủ Nhật</p><p>11:30 Sáng - 11:00 Tối</p>`;

  await supabase.from('page_sections').update({
    content_en: detailsContentEn,
    content_vi: detailsContentVi
  }).eq('page', 'contact').eq('section_key', 'details');

  console.log("Contact sections updated successfully");
}
main().catch(console.error);
