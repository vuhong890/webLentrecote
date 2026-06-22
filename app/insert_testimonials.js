const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('page_sections')
      .select('id')
      .eq('page', 'reservation')
      .eq('section_key', 'testimonials');

    if (checkError) throw checkError;

    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase
        .from('page_sections')
        .insert([{
          page: 'reservation',
          section_key: 'testimonials',
          title_en: 'WHAT OUR GUESTS SAY',
          title_vi: 'KHÁCH HÀNG NÓI GÌ',
          metadata: {
            items: [
              { stars: 5, text_en: 'Perfect for business lunches and client dinners.', text_vi: 'Hoàn hảo cho bữa trưa công việc và ăn tối cùng đối tác.', source_en: '- Google Review', source_vi: '- Google Review' },
              { stars: 5, text_en: 'The steak is amazing, fries are addictive, service is excellent.', text_vi: 'Bò bít tết tuyệt vời, khoai tây chiên gây nghiện, phục vụ xuất sắc.', source_en: '- Tripadvisor', source_vi: '- Tripadvisor' },
              { stars: 5, text_en: 'A hidden gem in District 1. Feels like a Parisian bistro.', text_vi: 'Một viên ngọc ẩn mình tại Quận 1. Cảm giác như một quán bistro ở Paris.', source_en: '- Facebook Review', source_vi: '- Đánh giá Facebook' },
              { stars: 5, text_en: 'Best Entrecôte I have had in Asia. Highly recommended!', text_vi: 'Món Entrecôte ngon nhất tôi từng ăn ở Châu Á. Rất đáng thử!', source_en: '- Google Review', source_vi: '- Google Review' }
            ]
          }
        }]);

      if (insertError) throw insertError;
      console.log('Inserted testimonials section.');
    } else {
      console.log('Testimonials section already exists.');
    }
  } catch (e) {
    console.error(e);
  }
}

run();
