const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const resContentEn = `<p><strong>LUNCH</strong> 11:30 AM – 2:00 PM</p>
<p><strong>DINNER</strong> 4:00 PM – 11:00 PM</p>
<p><strong>LAST ORDER</strong> 10:00 PM</p>
<hr>
<p><strong>DRESS CODE</strong> Smart Casual</p>
<p><strong>LOCATION</strong> Level 2, Dong Du,<br>Saigon Ward, HCMC</p>`;

  const resContentVi = `<p><strong>TRƯA</strong> 11:30 Sáng – 2:00 Chiều</p>
<p><strong>TỐI</strong> 4:00 Chiều – 11:00 Tối</p>
<p><strong>GỌI MÓN CUỐI</strong> 10:00 Tối</p>
<hr>
<p><strong>TRANG PHỤC</strong> Lịch sự, thoải mái</p>
<p><strong>ĐỊA CHỈ</strong> Tầng 2, Đồng Du,<br>Phường Sài Gòn, TP. HCM</p>`;

  const contactContentEn = `<h4>📍 L'Entrecôte Saigon</h4>
<p>L'Entrecôte Social Meating</p>
<p>Level 2, Dong Du</p>
<p>Saigon Ward, Ho Chi Minh City</p>
<br>
<h4>⏰ Opening Hours</h4>
<p><strong>Lunch:</strong> 11:30 AM – 2:00 PM</p>
<p><strong>Dinner:</strong> 4:00 PM – 11:00 PM</p>
<p><strong>Last Order:</strong> 10:00 PM</p>
<p><em>Open daily</em></p>
<br>
<h4>📞 Hotline</h4>
<p>(+84) 32 7157 002</p>
<br>
<h4>📧 Email</h4>
<p>booking@lentrecotevietnam.com</p>`;

  const contactContentVi = `<h4>📍 L'Entrecôte Sài Gòn</h4>
<p>L'Entrecôte Social Meating</p>
<p>Tầng 2, Đồng Du</p>
<p>Phường Sài Gòn, TP. Hồ Chí Minh</p>
<br>
<h4>⏰ Giờ Mở Cửa</h4>
<p><strong>Trưa:</strong> 11:30 Sáng – 2:00 Chiều</p>
<p><strong>Tối:</strong> 4:00 Chiều – 11:00 Tối</p>
<p><strong>Gọi món cuối:</strong> 10:00 Tối</p>
<p><em>Mở cửa mỗi ngày</em></p>
<br>
<h4>📞 Hotline</h4>
<p>(+84) 32 7157 002</p>
<br>
<h4>📧 Email</h4>
<p>booking@lentrecotevietnam.com</p>`;

  await supabase.from('page_sections').update({
    content_en: resContentEn,
    content_vi: resContentVi
  }).eq('page', 'reservation').eq('section_key', 'booking_info');

  await supabase.from('page_sections').update({
    content_en: contactContentEn,
    content_vi: contactContentVi
  }).eq('page', 'contact').eq('section_key', 'details');

  console.log("Database updated successfully");
}
main().catch(console.error);
