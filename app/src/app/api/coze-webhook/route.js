import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function normalizeString(str) {
  if (!str) return '';
  return str.replace(/[\s\.\-\+]/g, '').toLowerCase();
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received Coze Webhook Data:', data);
    // Data expected: ten_khach, so_dien_thoai, ngay_dat, gio_dat, so_nguoi, ghi_chu
    
    let psid = null;
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const botToken = process.env.FACEBOOK_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID; // Can reuse existing chat ID

    // 1. Find PSID via Facebook Graph API
    if (pageAccessToken && data.so_dien_thoai) {
      try {
        const url = `https://graph.facebook.com/v20.0/me/conversations?limit=20&fields=messages.limit(20){message,from}&access_token=${pageAccessToken}`;
        const fbRes = await fetch(url);
        const fbData = await fbRes.json();
        
        const targetPhone = normalizeString(data.so_dien_thoai);
        const targetName = (data.ten_khach || '').toLowerCase().trim();
        
        let found = false;
        
        if (fbData.data && fbData.data.length > 0) {
          for (const conv of fbData.data) {
            if (conv.messages && conv.messages.data) {
              for (const msg of conv.messages.data) {
                // Check if message contains Phone or Name
                const msgText = msg.message || '';
                const msgNorm = normalizeString(msgText);
                const isPhoneMatch = targetPhone && msgNorm.includes(targetPhone);
                const isNameMatch = targetName && msgText.toLowerCase().includes(targetName);
                
                if (isPhoneMatch || isNameMatch) {
                  psid = msg.from.id;
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }
        
        // Fallback: take the most recent sender if no match found
        if (!psid && fbData.data && fbData.data[0] && fbData.data[0].messages) {
           const messages = fbData.data[0].messages.data;
           if (messages && messages.length > 0) {
              psid = messages[0].from.id;
           }
        }
      } catch (fbErr) {
        console.error('Error fetching PSID from Facebook:', fbErr);
      }
    }

    // 2. Save to Database
    let reservationId = crypto.randomUUID();

    try {
      const { data: insertedData, error } = await supabase
        .from('reservations')
        .insert([{
          full_name: data.ten_khach || 'Khách Facebook',
          phone: data.so_dien_thoai || '',
          date: data.ngay_dat || new Date().toISOString().split('T')[0],
          time: data.gio_dat || '19:00',
          guests: parseInt(data.so_nguoi) || 2,
          note: data.ghi_chu || '',
          source: 'facebook',
          psid: psid,
          status: 'pending'
        }])
        .select()
        .single();
        
      if (!error && insertedData) {
        reservationId = insertedData.id;
      } else {
        console.error('Error insert Supabase:', error);
      }
    } catch (dbErr) {
      console.error('DB Error:', dbErr);
    }

    // 3. Send to Telegram
    if (botToken && chatId) {
      const message = `🔔 *CÓ YÊU CẦU ĐẶT BÀN MỚI TỪ FACEBOOK* 🔔\n\n`
        + `👤 Tên: ${data.ten_khach || 'Không rõ'}\n`
        + `📞 SĐT: ${data.so_dien_thoai || 'Không rõ'}\n`
        + `📅 Ngày: ${data.ngay_dat || 'Không rõ'}\n`
        + `⏰ Giờ: ${data.gio_dat || 'Không rõ'}\n`
        + `👥 Số lượng: ${data.so_nguoi || 'Không rõ'}\n`
        + `📝 Ghi chú: ${data.ghi_chu || 'Không'}\n\n`
        + `🔍 PSID: ${psid || 'Không tìm thấy'}`;

      const times = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"];
      const inline_keyboard = [
        [
          { text: "✅ Yes", callback_data: `confirm_${reservationId}` }
        ]
      ];
      
      for (let i = 0; i < times.length; i += 3) {
        const row = times.slice(i, i + 3).map(time => ({
          text: time,
          callback_data: `newtime_${reservationId}_${time}`
        }));
        inline_keyboard.push(row);
      }

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: inline_keyboard
          }
        })
      });
    }

    return NextResponse.json({ ok: true, message: 'Dữ liệu đã được xử lý' });
  } catch (err) {
    console.error('Coze webhook error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
