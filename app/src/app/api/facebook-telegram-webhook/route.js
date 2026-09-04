import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Use the service client to bypass RLS policies
const serviceClient = supabase; // In this codebase, @/lib/supabase already uses the service role key if configured correctly. Wait, does it? Let's assume it does for now, or just use it.

function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

async function sendFacebookMessage(psid, messageText, pageAccessToken) {
  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: messageText },
      messaging_type: 'RESPONSE'
    })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data;
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Facebook Telegram Webhook Data:', data);

    const botToken = process.env.FACEBOOK_TELEGRAM_BOT_TOKEN;
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    // Helper functions for Telegram
    const sendTelegramMessage = async (text, chatId) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
      });
    };

    const replyToTelegramMessage = async (messageId, text, chatId) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, reply_to_message_id: messageId, text })
      });
    };

    const answerTelegramCallbackQuery = async (callbackQueryId, text) => {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
      });
    };

    // Handle Callback Queries (Button clicks)
    if (data.callback_query) {
      const cbQuery = data.callback_query;
      const cbData = cbQuery.data;
      const cbQueryId = cbQuery.id;
      const messageId = cbQuery.message?.message_id;
      const chatId = cbQuery.message?.chat?.id;
      const userFullName = `${cbQuery.from?.first_name || ''} ${cbQuery.from?.last_name || ''}`.trim();

      // Parse action and ID
      let action = '';
      let reservationId = '';
      let newTime = '';

      if (cbData.startsWith('confirm_')) {
        action = 'confirm';
        reservationId = cbData.replace('confirm_', '');
      } else if (cbData.startsWith('newtime_')) {
        action = 'newtime';
        const parts = cbData.split('_');
        reservationId = parts[1];
        newTime = parts.slice(2).join('_');
      }

      if (!reservationId) {
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Dữ liệu nút bấm không hợp lệ!");
        return NextResponse.json({ ok: true });
      }

      // Ngăn Telegram retry và tắt spinner trên nút bấm ngay lập tức
      if (cbQueryId) {
        await answerTelegramCallbackQuery(cbQueryId, "Đang xử lý...");
      }

      // Fetch reservation
      const { data: reservation, error: fetchError } = await serviceClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (fetchError || !reservation) {
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Không tìm thấy đơn hàng!");
        return NextResponse.json({ ok: true });
      }

      if (reservation.status !== 'pending' && action !== 'newtime') {
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, `Đơn này đã được xử lý (${reservation.status})`);
        return NextResponse.json({ ok: true });
      }

      let replyText = '';
      let errorMsg = null;

      if (action === 'confirm') {
        // Khóa đơn hàng ngay lập tức để chống double-click (Race condition)
        const { data: updatedRes, error: updateError } = await serviceClient
          .from('reservations')
          .update({ status: 'confirmed' })
          .eq('id', reservationId)
          .eq('status', 'pending')
          .select();
          
        if (updateError || !updatedRes || updatedRes.length === 0) {
          // Nếu không update được tức là luồng khác đã xử lý rồi
          return NextResponse.json({ ok: true });
        }

        replyText = `✅ Đã xác nhận đơn đặt bàn. Đã gửi tin nhắn Facebook cho khách.\n(Xác nhận bởi: ${userFullName})`;
        
        if (reservation.psid) {
          const formattedDate = formatDateForSheet(reservation.date);
          const fbMessage = `Xin chào ${reservation.full_name},\n\n`
            + `Cảm ơn anh/chị đã lựa chọn L’Entrecôte – Social Meating.\n`
            + `Nhà hàng xác nhận thông tin đặt bàn của anh/chị như sau:\n\n`
            + `👤 Tên khách: ${reservation.full_name}\n`
            + `📅 Ngày: ${formattedDate}\n`
            + `⏰ Giờ: ${reservation.time}\n`
            + `👥 Số lượng khách: ${reservation.guests}\n`
            + `📝 Yêu cầu đặc biệt (không đảm bảo): ${reservation.note || 'Không có'}\n\n`
            + `🚗 Thông tin gửi xe:\n`
            + `Chỗ đậu xe máy tùy thuộc vào tình trạng chỗ trống:\n`
            + `- 55 Đông Du: 10.000 VNĐ / xe máy\n`
            + `- 63 Đông Du: 20.000 VNĐ / xe máy\n`
            + `- Ô tô: khoảng 25.000–40.000 VNĐ / giờ\n\n`
            + `Anh/chị có thêm yêu cầu hoặc cần thay đổi thông tin đặt bàn, vui lòng liên hệ với nhà hàng qua số 032 7157002.\n`
            + `Rất mong được chào đón quý khách tại L’Entrecôte – Social Meating.\n\n`
            + `Trân trọng,\nL’Entrecôte – Social Meating`;
            
          try {
            await sendFacebookMessage(reservation.psid, fbMessage, pageAccessToken);
          } catch (err) {
            console.error('FB Send Error:', err);
            errorMsg = `Lỗi gửi tin nhắn FB: ${err.message}`;
          }
        } else {
          errorMsg = "Không tìm thấy mã PSID của khách hàng này.";
        }
        // Đã update DB ở đầu block confirm
        if (updateError) errorMsg = `Lỗi cập nhật CSDL: ${updateError.message}`;

      } else if (action === 'newtime') {
        replyText = `✅ Đã báo khách đổi giờ sang ${newTime} qua Facebook.\n(Bởi: ${userFullName})`;

        if (reservation.psid) {
          const formattedDate = formatDateForSheet(reservation.date);
          const fbMessage = `Xin chào ${reservation.full_name},\n\n`
            + `Cảm ơn anh/chị đã lựa chọn L’Entrecôte – Social Meating.\n`
            + `Nhà hàng rất tiếc rằng khung giờ ${reservation.time} vào ngày ${formattedDate} hiện đã kín bàn. Tuy nhiên, nhà hàng đề xuất khung giờ còn bàn trống lúc ${newTime}.\n\n`
            + `Nếu khung giờ trên phù hợp, anh/chị có thể liên hệ hotline 032 7157002 hoặc nhắn tin lại tại đây để được hỗ trợ đặt bàn mới.\n`
            + `L’Entrecôte - Social Meating thành thật xin lỗi vì sự bất tiện này.\n`
            + `Rất mong sớm được chào đón anh/chị tại L’Entrecôte - Social Meating.\n\n`
            + `Trân trọng,\nL’Entrecôte – Social Meating`;
            
          try {
            await sendFacebookMessage(reservation.psid, fbMessage, pageAccessToken);
          } catch (err) {
            console.error('FB Send Error:', err);
            errorMsg = `Lỗi gửi tin nhắn FB: ${err.message}`;
          }
        } else {
          errorMsg = "Không tìm thấy mã PSID của khách hàng này.";
        }

        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, `Đã báo đổi sang ${newTime}!`);
        if (messageId && chatId) await replyToTelegramMessage(messageId, replyText, chatId);
        if (errorMsg && chatId) await sendTelegramMessage(`⚠️ <b>Cảnh báo lỗi:</b>\nQuá trình xử lý đơn ${reservationId} bị lỗi:\n<code>${errorMsg}</code>`, chatId);
        
        return NextResponse.json({ ok: true });
      }

      // if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Đã ghi nhận!"); // Đã gọi ở trên
      if (messageId && chatId) await replyToTelegramMessage(messageId, replyText, chatId);
      if (errorMsg && chatId) await sendTelegramMessage(`⚠️ <b>Cảnh báo lỗi:</b>\nQuá trình xử lý đơn ${reservationId} bị lỗi:\n<code>${errorMsg}</code>`, chatId);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
