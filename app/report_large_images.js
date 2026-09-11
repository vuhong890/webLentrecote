const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateReport() {
  console.log('Fetching all used URLs from database...');
  const usedImages = []; // Array of { url, context }

  const addUrl = (url, context) => {
    if (!url) return;
    if (url.includes('|')) {
      const parts = url.split('|');
      addUrl(parts[0], context + ' (EN)');
      addUrl(parts[1], context + ' (VI)');
    } else if (url.includes('supabase.co/storage')) {
      usedImages.push({ url, context });
    }
  };

  const { data: settings } = await supabase.from('site_settings').select('key, value');
  if (settings) {
    settings.forEach(s => {
      if (s.value && s.value.includes('supabase.co/storage')) {
        addUrl(s.value, `site_settings (${s.key})`);
      }
    });
  }

  const fetchUrls = async (table, col, contextBuilder) => {
    const { data } = await supabase.from(table).select('*');
    if (data) {
      data.forEach(row => {
        addUrl(row[col], `Table: ${table} - ` + contextBuilder(row));
      });
    }
  };

  await fetchUrls('menu_items', 'image_url', r => `Item: ${r.name_en}`);
  await fetchUrls('menu_categories', 'image_url', r => `Category: ${r.name_en}`);
  await fetchUrls('gallery', 'image_url', r => `Title: ${r.title_en}`);
  await fetchUrls('home_gallery', 'image_url', r => `ID: ${r.id}`);
  await fetchUrls('signature_items', 'image_url', r => `Item: ${r.name_en}`);
  await fetchUrls('page_sections', 'image_url', r => `Page: ${r.page}, Section: ${r.section_key}`);
  await fetchUrls('page_sections', 'icon_url', r => `Page: ${r.page}, Section: ${r.section_key} (Icon)`);

  const largeFiles = [];

  const checkBucket = async (bucket) => {
    console.log(`Scanning bucket: ${bucket}`);
    const { data: files, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
    if (error) return;

    for (const file of files) {
      if (file.metadata && file.metadata.size > 0.5 * 1024 * 1024) { // > 0.5MB
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
        
        // Find if this URL is used
        const usages = usedImages.filter(ui => ui.url === publicUrl);
        if (usages.length > 0) {
          largeFiles.push({
            bucket,
            name: file.name,
            sizeMB: (file.metadata.size / 1024 / 1024).toFixed(2),
            url: publicUrl,
            usages: usages.map(u => u.context)
          });
        }
      }
    }
  };

  await checkBucket('menu-images');
  await checkBucket('page-assets');
  await checkBucket('gallery');

  // Sort by size descending
  largeFiles.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));

  let md = `# Báo Cáo: Các Hình Ảnh Đang Sử Dụng Có Dung Lượng Lớn (>0.5MB)\n\n`;
  md += `Dưới đây là danh sách các bức ảnh đang được sử dụng trực tiếp trên website nhưng có dung lượng rất lớn. Khi truy cập vào trang Admin để chỉnh sửa các mục này, trình duyệt sẽ tải toàn bộ dung lượng gốc của chúng, gây hao tốn Egress.\n\n`;
  md += `Bạn có thể click vào link để xem ảnh, nén lại bằng TinyPNG và sau đó vào Admin để upload đè lên thay thế.\n\n`;

  if (largeFiles.length === 0) {
    md += `**Tuyệt vời! Không có bức ảnh nào đang sử dụng nặng trên 0.5MB.**\n`;
  } else {
    for (const file of largeFiles) {
      md += `### 🔴 [${file.name}](${file.url})\n`;
      md += `- **Dung lượng:** ${file.sizeMB} MB\n`;
      md += `- **Thư mục (Bucket):** ${file.bucket}\n`;
      md += `- **Vị trí đang sử dụng trên Web:**\n`;
      file.usages.forEach(u => {
        md += `  - ${u}\n`;
      });
      md += `\n`;
    }
  }

  fs.writeFileSync('C:\\Users\\phanq\\.gemini\\antigravity-ide\\brain\\4f3f857b-69fc-47fb-a7fe-2e6dc766f539\\large_images_report.md', md);
  console.log('Report generated at large_images_report.md');
}

generateReport().catch(console.error);
