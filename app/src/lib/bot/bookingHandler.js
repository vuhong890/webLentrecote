import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

function parseDateToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Parse DD/MM/YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts.length >= 3 ? parts[2] : new Date().getFullYear().toString();
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function formatTime(timeStr) {
  if (!timeStr) return '19:00';
  let formatted = timeStr.toLowerCase().replace('h', ':');
  formatted = formatted.replace(/[^0-9:]/g, '');
  const parts = formatted.split(':');
  if (parts.length > 0) {
    const hours = parts[0].padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${hours}:${minutes}`;
    }
  }
  return '19:00';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Xử lý tạo đơn đặt bàn và bắn thông báo Telegram
 */
export async function handleConfirmBooking({ bookingData, senderPsid, platform = 'facebook' }) {
  const botToken = process.env.FACEBOOK_TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;
  let isTestMode = false;

  // Lấy cài đặt test mode nếu có
  try {
    const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
    if (settingsData) {
      const settings = {};
      settingsData.forEach(s => settings[s.key] = s.value);
      isTestMode = settings.facebook_test_mode === 'true';
      if (isTestMode && settings.facebook_test_chat_id) {
        chatId = settings.facebook_test_chat_id;
      }
    }
  } catch (err) {
    console.error('Error fetching site_settings:', err);
  }

  const isoDate = parseDateToISO(bookingData.booking_date);
  const formattedTime = formatTime(bookingData.booking_time);

  // 1. Lưu vào Database reservations
  let reservationId = crypto.randomUUID();
  try {
    const { data: insertedData, error } = await serviceClient
      .from('reservations')
      .insert([{
        full_name: bookingData.customer_name || 'Khách Facebook',
        phone: bookingData.phone_number || '',
        email: '',
        branch: '',
        date: isoDate,
        time: formattedTime,
        guests: parseInt(bookingData.guest_count) || 2,
        note: bookingData.notes || '',
        source: platform === 'instagram' ? 'IG' : 'FB',
        psid: senderPsid,
        status: 'pending'
      }])
      .select()
      .single();

    if (!error && insertedData) {
      reservationId = insertedData.id;
    } else {
      console.error('Lỗi khi insert Supabase reservations:', error);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ insert reservations:', err);
  }

  // 2. Gửi thông báo đến Telegram cho nhân viên
  if (botToken && chatId) {
    try {
      const shortId = reservationId.slice(0, 8);
      const testPrefix = isTestMode ? '🧪 <b>[TEST MODE]</b>\n' : '';
      
      const messageText = 
        `${testPrefix}🔔 <b>YÊU CẦU ĐẶT BÀN MỚI TỪ AI BOT (${platform.toUpperCase()})</b>\n\n` +
        `👤 <b>Khách hàng:</b> ${escapeHtml(bookingData.customer_name)}\n` +
        `📞 <b>Số điện thoại:</b> ${escapeHtml(bookingData.phone_number)}\n` +
        `📅 <b>Ngày:</b> ${escapeHtml(bookingData.booking_date)}\n` +
        `⏰ <b>Giờ:</b> ${escapeHtml(formattedTime)}\n` +
        `👥 <b>Số khách:</b> ${bookingData.guest_count} người\n` +
        `📝 <b>Ghi chú:</b> ${escapeHtml(bookingData.notes || 'Không có')}\n` +
        `🆔 <b>ID Đơn:</b> <code>${reservationId}</code>\n` +
        `💬 <b>PSID:</b> <code>${senderPsid || 'N/A'}</code>\n\n` +
        `<i>Vui lòng chọn thao tác bên dưới:</i>`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: `✅ Yes (${shortId})`, callback_data: `confirm_${reservationId}` },
            { text: `🔄 Reschedule (${shortId})`, callback_data: `reschedule_${reservationId}` }
          ]
        ]
      };

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
    } catch (teleErr) {
      console.error('Error sending Telegram notification:', teleErr);
    }
  }

  return reservationId;
}
