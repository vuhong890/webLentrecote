import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function formatTimeForSheet(timeStr) {
  if (!timeStr) return '';
  let formatted = timeStr.toLowerCase().replace('h', ':');
  formatted = formatted.replace(/[^0-9:]/g, '');
  const parts = formatted.split(':');
  if (parts.length > 0) {
    const hours = parts[0].padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    return `${hours}h${minutes}`;
  }
  return timeStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    const sendTelegramMessage = async (text, chatId, extraOptions = {}) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extraOptions })
      });
    };

    const replyToTelegramMessage = async (messageId, text, chatId) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, reply_to_message_id: messageId, text, parse_mode: 'HTML' })
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
      } else if (cbData.startsWith('reschedule_')) {
        action = 'reschedule';
        reservationId = cbData.replace('reschedule_', '');
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
        // if (chatId) await sendTelegramMessage(`DEBUG: Bắt đầu xử lý đơn ${reservationId}, action: ${action}`, chatId);
      }

      // Fetch reservation
      const { data: reservation, error: fetchError } = await serviceClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      // Load Settings from DB
      let isTestMode = false;
      let sheetUrl = null;
      let isAutoReply = false;
      const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
      if (settingsData) {
        const settings = {};
        settingsData.forEach(s => settings[s.key] = s.value);
        isTestMode = settings.facebook_test_mode === 'true';
        sheetUrl = isTestMode ? settings.test_google_sheet_url : settings.google_sheet_url;
        isAutoReply = settings.facebook_auto_reply === 'true';
      }

      if (fetchError || !reservation) {
        // if (chatId) await sendTelegramMessage(`DEBUG: Không tìm thấy đơn hàng. Lỗi: ${fetchError?.message || 'reservation is null'}`, chatId);
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Không tìm thấy đơn hàng!");
        return NextResponse.json({ ok: true });
      }
      // if (chatId) await sendTelegramMessage(`DEBUG: Đã tìm thấy đơn hàng. Trạng thái hiện tại: ${reservation.status}`, chatId);

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
          // if (chatId) await sendTelegramMessage(`DEBUG: Không update được. Error: ${updateError?.message}. Length: ${updatedRes?.length}`, chatId);
          // Nếu không update được tức là luồng khác đã xử lý rồi
          return NextResponse.json({ ok: true });
        }
        // if (chatId) await sendTelegramMessage(`DEBUG: Đã update thành confirmed. Đang gửi FB...`, chatId);

        const fbConfirmationText = `Nhà hàng đã ghi nhận bàn đặt của anh/chị. Bàn sẽ được giữ trong 15p, sau thời gian này bàn có thể sẽ sắp xếp cho lượt khách khác. Nếu có thay đổi, anh/chị liên hệ lại để được hỗ trợ. Cảm ơn anh/chị\n\n`
          + `We have noted your reservation. After this period, the table may be released to accommodate other guests. If you have any change, please contact in advance to assist your reservation. We will keep your table for 15 minutes. Thank you.\n`
          + `---\n`
          + `Thông tin gửi xe/Parking Information:\n`
          + `- Xe máy/Scooter: 55 Đông Du (10k/xe) hoặc 63 Đông Du (30k/xe).\n`
          + `- Xe hơi/Car: 63 Đông Du (25k/hr).`;

        if (isAutoReply) {
          // CHẾ ĐỘ TỰ ĐỘNG (KHI META ĐÃ DUYỆT API)
          if (reservation.psid) {
            replyText = `✅ Đã xác nhận đơn đặt bàn. Đã gửi tin nhắn Facebook cho khách.\n(Xác nhận bởi: ${escapeHtml(userFullName)})`;
            if (isTestMode) replyText += ' [TEST FB]';

            try {
              await sendFacebookMessage(reservation.psid, fbConfirmationText, pageAccessToken);
            } catch (err) {
              console.error('FB Send Error:', err);
              errorMsg = `Lỗi gửi tin nhắn FB: ${err.message}`;
            }
          } else {
            replyText = `✅ Đã xác nhận đơn đặt bàn vào hệ thống (Chưa gửi FB do không có PSID).\n(Xác nhận bởi: ${escapeHtml(userFullName)})`;
            if (isTestMode) replyText += ' [TEST FB]';
            errorMsg = "Không tìm thấy mã PSID của khách hàng này để gửi tin nhắn Facebook tự động. Vui lòng nhắn tin trực tiếp cho khách trên Fanpage!";
          }
        } else {
          // CHẾ ĐỘ BÁN TỰ ĐỘNG (CHỜ META DUYỆT - MẶC ĐỊNH)
          replyText = `✅ <b>Đã xác nhận đơn trên hệ thống & lưu Google Sheets!</b>\n`
            + `(Xác nhận bởi: ${escapeHtml(userFullName)})${isTestMode ? ' [TEST FB]' : ''}\n\n`
            + `📢 <b>NHẮN KHÁCH:</b> Nhân viên vui lòng vào Fanpage nhắn tin xác nhận giữ bàn cho khách <b>${escapeHtml(reservation.full_name)}</b>.\n\n`
            + `💬 <b>Mẫu tin nhắn gửi khách (Chạm vào ô bên dưới để sao chép):</b>\n`
            + `<code>${escapeHtml(fbConfirmationText)}</code>`;
        }

        // Push to Google Sheets (luôn chạy khi xác nhận để đồng bộ)
        if (sheetUrl) {
          try {
            await fetch(sheetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loai_xu_ly: "Yes",
                ngay_dat: formatDateForSheet(reservation.date),
                ten_khach: reservation.full_name,
                so_nguoi: reservation.guests,
                gio_dat: formatTimeForSheet(reservation.time),
                ghi_chu: reservation.note,
                so_dien_thoai: reservation.phone,
                nguon: "FB"
              })
            });
          } catch (err) {
            console.error('Error pushing to sheet:', err);
          }
        }
        // Đã update DB ở đầu block confirm
        if (updateError) errorMsg = `Lỗi cập nhật CSDL: ${updateError.message}`;

      } else if (action === 'reschedule') {
        const times = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"];
        const inline_keyboard = [];
        for (let i = 0; i < times.length; i += 3) {
          const row = times.slice(i, i + 3).map(time => ({
            text: time,
            callback_data: `newtime_${reservationId}_${time}`
          }));
          inline_keyboard.push(row);
        }
        const msgText = `Vui lòng chọn khung giờ mới cho khách hàng:\n` +
                        `👤 Tên: ${escapeHtml(reservation.full_name)}\n` +
                        `📞 SĐT: ${escapeHtml(reservation.phone) || 'Không có'}\n` +
                        `📅 Lịch cũ: ${escapeHtml(reservation.time)} - ${formatDateForSheet(reservation.date)}`;
        
        await sendTelegramMessage(msgText, chatId, { reply_markup: { inline_keyboard } });
        if (cbQueryId) {
          await answerTelegramCallbackQuery(cbQueryId, "Vui lòng chọn giờ bên dưới");
        }
        return NextResponse.json({ ok: true });

      } else if (action === 'newtime') {
        const formattedDate = formatDateForSheet(reservation.date);
        const fbRescheduleText = `Xin chào ${reservation.full_name || 'anh/chị'},\n\n`
          + `Cảm ơn anh/chị đã lựa chọn L’Entrecôte – Social Meating.\n`
          + `Nhà hàng rất tiếc rằng khung giờ ${reservation.time} vào ngày ${formattedDate} hiện đã kín bàn. Tuy nhiên, nhà hàng đề xuất khung giờ còn bàn trống lúc ${newTime}.\n\n`
          + `Nếu khung giờ trên phù hợp, anh/chị có thể liên hệ hotline 032 7157002 hoặc nhắn tin lại tại đây để được hỗ trợ đặt bàn mới.\n`
          + `L’Entrecôte - Social Meating thành thật xin lỗi vì sự bất tiện này.\n`
          + `Rất mong sớm được chào đón anh/chị tại L’Entrecôte - Social Meating.\n\n`
          + `Trân trọng,\nL’Entrecôte – Social Meating`;

        if (isAutoReply) {
          // CHẾ ĐỘ TỰ ĐỘNG
          if (reservation.psid) {
            replyText = `✅ Đã báo khách đổi giờ sang ${newTime} qua Facebook.\n(Bởi: ${escapeHtml(userFullName)})`;
            if (isTestMode) replyText += ' [TEST FB]';

            try {
              await sendFacebookMessage(reservation.psid, fbRescheduleText, pageAccessToken);
            } catch (err) {
              console.error('FB Send Error:', err);
              errorMsg = `Lỗi gửi tin nhắn FB: ${err.message}`;
            }
          } else {
            replyText = `⚠️ Đã ghi nhận đề xuất đổi giờ sang ${newTime} (Chưa gửi FB do không có PSID).\n(Bởi: ${escapeHtml(userFullName)})`;
            if (isTestMode) replyText += ' [TEST FB]';
            errorMsg = "Không tìm thấy mã PSID của khách hàng này để gửi tin nhắn Facebook tự động. Vui lòng nhắn tin trực tiếp cho khách trên Fanpage!";
          }
        } else {
          // CHẾ ĐỘ BÁN TỰ ĐỘNG (CHỜ META DUYỆT - MẶC ĐỊNH)
          replyText = `🔄 <b>Đã chọn đề xuất đổi giờ sang: ${newTime}</b>\n`
            + `(Xử lý bởi: ${escapeHtml(userFullName)})${isTestMode ? ' [TEST FB]' : ''}\n`
            + `📞 SĐT khách: <b>${escapeHtml(reservation.phone) || 'Không có'}</b> <i>(nhân viên có thể gọi điện trực tiếp)</i>\n\n`
            + `💬 <b>Mẫu tin nhắn chat Fanpage (Chạm vào ô bên dưới để sao chép):</b>\n`
            + `<code>${escapeHtml(fbRescheduleText)}</code>`;
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
