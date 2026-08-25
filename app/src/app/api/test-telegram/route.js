import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic'; // prevent caching

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

export async function GET(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  let isTestMode = false;
  try {
    const { data: settingsData } = await serviceClient.from('site_settings').select('key, value').eq('key', 'is_test_mode').single();
    if (settingsData) {
      isTestMode = settingsData.value === 'true';
    }
  } catch (e) {
    console.error(e);
  }

  let results = {
    envVars: {
      hasToken: !!token,
      hasChatId: !!chatId,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      isTestMode: isTestMode
    },
    telegramTest: 'Pending'
  };

  try {
    // Send a test message to Telegram
    if (token && chatId) {
      const res = await sendTelegramMessage('🛠️ Hệ thống gửi tin nhắn tự động từ <b>/api/test-telegram</b>.\nTrạng thái: OK.');
      if (res && res.ok) {
        results.telegramTest = 'Thành công (Tin nhắn đã được gửi vào Group)';
      } else {
        results.telegramTest = `Thất bại: ${JSON.stringify(res)}`;
      }
    } else {
      results.telegramTest = 'Bỏ qua (Thiếu Token hoặc Chat ID)';
    }

    return NextResponse.json({
      message: 'Kiểm tra hệ thống Telegram Webhook',
      huong_dan: 'Nếu TelegramTest là Thành công, hãy đảm bảo trên Vercel có biến IS_TEST_MODE=true. Nếu có, bạn có thể bấm thử nút Yes/No ở các tin nhắn cũ trong Group để xem Webhook có xử lý và nhả lỗi hay không.',
      results
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
