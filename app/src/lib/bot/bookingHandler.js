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

export function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Xử lý khách hàng CHỦ ĐỘNG yêu cầu dời lịch / đổi giờ
 */
export async function handleRescheduleBooking({ rescheduleData, senderPsid, platform = 'facebook', originalReservation }) {
  const botToken = process.env.FACEBOOK_TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;
  let isTestMode = false;
  let sheetUrl = null;

  try {
    const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
    if (settingsData) {
      const settings = {};
      settingsData.forEach(s => settings[s.key] = s.value);
      isTestMode = settings.facebook_test_mode === 'true';
      sheetUrl = isTestMode ? settings.test_google_sheet_url : settings.google_sheet_url;
      if (isTestMode && settings.facebook_test_chat_id) {
        chatId = settings.facebook_test_chat_id;
      }
    }
  } catch (err) {
    console.error('Error fetching site_settings in reschedule:', err);
  }

  let reservation = originalReservation;
  const reservationId = rescheduleData.reservation_id || reservation?.id;

  if (!reservation && reservationId) {
    const { data } = await serviceClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .maybeSingle();
    reservation = data;
  }

  if (!reservation) {
    console.error('Không tìm thấy đơn đặt bàn để reschedule:', reservationId);
    return null;
  }

  const oldTime = reservation.time || '19:00';
  const newTime = formatTime(rescheduleData.new_time);
  const newDateIso = rescheduleData.new_date ? parseDateToISO(rescheduleData.new_date) : reservation.date;
  const displayDate = formatDateForSheet(newDateIso);
  const guestCount = rescheduleData.guest_count ? parseInt(rescheduleData.guest_count) : (reservation.guests || 2);
  const customerName = reservation.full_name || 'Khách Facebook';
  const phoneNumber = reservation.phone || '';

  // 1. Cập nhật Database Supabase
  try {
    const updatePayload = {
      time: newTime,
      date: newDateIso,
      guests: guestCount,
      status: 'pending',
      note: `${reservation.note || ''} [Khách đổi sang: ${newTime}${rescheduleData.notes ? ' - ' + rescheduleData.notes : ''}]`.trim()
    };

    await serviceClient
      .from('reservations')
      .update(updatePayload)
      .eq('id', reservation.id);
  } catch (err) {
    console.error('Lỗi cập nhật CSDL reschedule:', err);
  }

  // 2. Gửi thông báo đến Telegram cho nhân viên
  if (botToken && chatId) {
    try {
      const shortId = reservation.id.slice(0, 8);
      const testPrefix = isTestMode ? '🧪 <b>[TEST MODE]</b>\n' : '';

      const messageText = 
        `${testPrefix}🔄 <b>KHÁCH YÊU CẦU ĐỔI GIỜ ĐẶT BÀN (${platform.toUpperCase()})</b>\n\n` +
        `👤 <b>Khách hàng:</b> ${escapeHtml(customerName)}\n` +
        `📞 <b>Số điện thoại:</b> ${escapeHtml(phoneNumber)}\n` +
        `📅 <b>Ngày:</b> ${escapeHtml(displayDate)}\n` +
        `⏰ <b>Giờ cũ:</b> ${escapeHtml(oldTime)} ➔ <b>Giờ mới:</b> <b>${escapeHtml(newTime)}</b>\n` +
        `👥 <b>Số khách:</b> ${guestCount} người\n` +
        `📝 <b>Ghi chú:</b> ${escapeHtml(rescheduleData.notes || 'Khách nhắn xin dời lịch trên chat')}\n` +
        `🆔 <b>ID Đơn:</b> <code>${reservation.id}</code>\n` +
        `💬 <b>PSID:</b> <code>${senderPsid || reservation.psid || 'N/A'}</code>\n\n` +
        `<i>Vui lòng chọn thao tác bên dưới:</i>`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: `✅ Xác nhận giờ mới (${shortId})`, callback_data: `confirm_${reservation.id}` },
            { text: `🔄 Đề xuất giờ khác (${shortId})`, callback_data: `reschedule_${reservation.id}` }
          ]
        ]
      };

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
      console.error('Error sending Telegram reschedule alert:', teleErr);
    }
  }

  // 3. Đồng bộ cập nhật lên Google Sheets
  if (sheetUrl) {
    try {
      const cleanCustomerNote = (rescheduleData.notes || reservation.note || '')
        .replace(/\[.*?\]/g, '')
        .trim();

      await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loai_xu_ly: "Reschedule",
          ngay_dat: displayDate,
          ten_khach: customerName,
          so_dien_thoai: phoneNumber,
          gio_dat_moi: newTime,
          gio_dat_cu: oldTime,
          ghi_chu: cleanCustomerNote // Chỉ gửi ghi chú thực tế của khách, không gắn tag hệ thống
        })
      });
    } catch (sheetErr) {
      console.error('Error syncing reschedule to Google Sheets:', sheetErr);
    }
  }

  return reservation.id;
}

