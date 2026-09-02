const readline = require('readline');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("Lỗi: Không tìm thấy TELEGRAM_BOT_TOKEN trong file .env.local");
  process.exit(1);
}

console.log("=== CÀI ĐẶT TELEGRAM WEBHOOK ===");
rl.question("Vui lòng nhập tên miền Web của bạn (ví dụ: https://weblentrecote.vercel.app): ", (domain) => {
  domain = domain.trim().replace(/\/$/, ""); // Xoá dấu / ở cuối nếu có
  if (!domain.startsWith('https://')) {
    console.error("Lỗi: Tên miền phải bắt đầu bằng https://");
    rl.close();
    return;
  }

  const webhookUrl = `${domain}/api/telegram-webhook`;
  const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  console.log(`\nĐang cài đặt Webhook về: ${webhookUrl}...`);

  https.get(apiUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log("✅ Thành công! Telegram Bot đã được kết nối với Website của bạn.");
        console.log("Toàn bộ Code xử lý lỗi Ngày/Giờ và Email mới nhất đã chính thức có hiệu lực!");
      } else {
        console.error("❌ Thất bại:", response.description);
      }
      rl.close();
    });
  }).on('error', (err) => {
    console.error("Lỗi kết nối:", err.message);
    rl.close();
  });
});
