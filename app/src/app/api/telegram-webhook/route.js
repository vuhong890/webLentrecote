import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { replyToTelegramMessage, answerTelegramCallbackQuery, sendTelegramMessage, sendForceReplyMessage } from '@/lib/telegram';
import { sendEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

// Helper function to format any date string/object to DD/MM/YYYY for Google Sheets
function formatDateForSheet(dateInput) {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  // Bắt mọi định dạng YYYY-MM-DD hoặc DD/MM/YYYY
  const match = str.match(/(\d{2,4})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (match) {
    let p1 = match[1], p2 = match[2], p3 = match[3];
    let year, month, day;
    if (p1.length === 4) { year = p1; month = p2; day = p3; } 
    else if (p3.length === 4) { year = p3; month = p2; day = p1; }
    else return dateInput; // fallback
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateInput;
}

// Helper function to format time (e.g. 19:00:00) to 19h00 for Google Sheets
function formatTimeForSheet(timeStr) {
  if (!timeStr) return '';
  return timeStr.substring(0, 5).replace(':', 'h');
}

export async function POST(request) {
  let cbQueryId = null;
  let chatId = null;
  let errorMsg = null;

  try {
    const body = await request.json();

    // 1. Check if this is a normal text message (replying to force reply for Reschedule)
    if (body.message && body.message.reply_to_message) {
      const repliedMsg = body.message.reply_to_message.text;
      if (repliedMsg && repliedMsg.includes('Vui lòng nhập giờ muốn đổi cho đơn #')) {
        const match = repliedMsg.match(/đơn #(\d+)/);
        if (match) {
          const reservationId = match[1];
          const newTime = body.message.text;

          // Fetch reservation
          const { data: reservation, error: fetchError } = await serviceClient
            .from('reservations')
            .select('*')
            .eq('id', reservationId)
            .single();

          if (fetchError || !reservation) {
            await sendTelegramMessage(`❌ Lỗi: Không tìm thấy đơn hàng ID ${reservationId}`);
            return NextResponse.json({ ok: true });
          }

          // Send Email to customer
          const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
          const settings = {};
          if (settingsData) {
            settingsData.forEach(s => settings[s.key] = s.value);
          }
          const IS_TEST_MODE = settings.telegram_test_mode === 'true';
          const testEmail = settings.test_email || process.env.EMAIL_USER;

          if (reservation.email) {
            const emailTo = IS_TEST_MODE ? testEmail : reservation.email;
            const subjectPrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';

            const emailRes = await sendEmail({
              to: emailTo,
              subject: `${subjectPrefix}[L'Entrecôte] Gợi ý đổi giờ đặt bàn - ${formatDateForSheet(reservation.date)}`,
              html: `<div style="font-family: sans-serif; padding: 20px;">
                <h2>Xin chào ${reservation.full_name},</h2>
                <p>L'Entrecôte rất xin lỗi phải thông báo rằng chúng tôi đã kín bàn vào lúc <strong>${reservation.time}</strong> ngày <strong>${formatDateForSheet(reservation.date)}</strong>.</p>
                <p>Bạn có thể đổi sang giờ <strong>${newTime}</strong> được không?</p>
                <p>Nếu bạn đồng ý, xin vui lòng liên hệ lại với số điện thoại <strong>(+84) 32 7157 002</strong> hoặc <a href="https://weblentrecote.vercel.app/reservation">đặt lại bàn trên website của chúng tôi</a>.</p>
                <br/>
                <p>Rất mong bạn thông cảm và hẹn gặp lại bạn!</p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>L'Entrecôte Saigon</strong></p>
                ${IS_TEST_MODE ? '<hr><p style="color:red">ĐÂY LÀ EMAIL THỬ NGHIỆM (TEST MODE). KHÁCH HÀNG THỰC TẾ KHÔNG NHẬN ĐƯỢC MAIL NÀY.</p>' : ''}
              </div>`
            });

            if (!emailRes.success) {
              await sendTelegramMessage(`⚠️ Lỗi gửi mail đổi giờ: ${emailRes.error?.message || emailRes.error}`);
            } else {
              await replyToTelegramMessage(body.message.message_id, `✅ Đã gửi email gợi ý đổi sang ${newTime} cho khách hàng.`);
            }
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Check if this is a Telegram callback_query (button click)
    if (body.callback_query) {
      const cb = body.callback_query;
      cbQueryId = cb.id; // Important: for answering the callback
      chatId = cb.message?.chat?.id;
      
      const data = cb.data; // e.g., "confirm_123"
      const messageId = cb.message?.message_id;
      const userFullName = `${cb.from.first_name || ''} ${cb.from.last_name || ''}`.trim() || cb.from.username || 'Admin';
      
      const [action, reservationId] = data.split('_');
      
      if (!reservationId) {
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Dữ liệu nút bấm không hợp lệ!");
        return NextResponse.json({ ok: true });
      }

      // Load Settings from DB
      const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
      const settings = {};
      if (settingsData) {
        settingsData.forEach(s => settings[s.key] = s.value);
      }
      const IS_TEST_MODE = settings.telegram_test_mode === 'true';
      const testEmail = settings.test_email || process.env.EMAIL_USER;
      const sheetUrl = IS_TEST_MODE ? settings.test_google_sheet_url : settings.google_sheet_url;

      // Fetch reservation
      const { data: reservation, error: fetchError } = await serviceClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();
        
      if (fetchError || !reservation) {
        console.error('Reservation not found', fetchError);
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Không tìm thấy đơn hàng trong Database!");
        if (chatId) await sendTelegramMessage(`❌ Lỗi Webhook: Không tìm thấy đơn hàng ID ${reservationId} trong Supabase.\nChi tiết: ${fetchError?.message}`);
        return NextResponse.json({ ok: true });
      }

      let newStatus = reservation.status;
      let replyText = '';
      
      if (action === 'confirm') {
        newStatus = 'confirmed';
        replyText = `---------------------------\nTình trạng xử lý: ✅ Yes\n(Bởi: ${userFullName})`;
        if (IS_TEST_MODE) replyText += ' [TEST MODE]';
        
        // Push to Google Sheets
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
                so_dien_thoai: reservation.phone
              })
            });
          } catch (err) {
            console.error('Error pushing to sheet', err);
          }
        }

        // Send Email
        if (reservation.email) {
          const emailTo = IS_TEST_MODE ? testEmail : reservation.email;
          const subjectPrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';
          
          const emailRes = await sendEmail({
            to: emailTo,
            subject: `${subjectPrefix}[L'Entrecôte] Xác nhận đặt bàn - ${formatDateForSheet(reservation.date)}`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Xin chào ${reservation.full_name},</h2>
              <p>L'Entrecôte xin xác nhận đơn đặt bàn của bạn vào lúc <strong>${reservation.time}</strong> ngày <strong>${formatDateForSheet(reservation.date)}</strong> cho <strong>${reservation.guests}</strong> người đã được xác nhận thành công.</p>
              <p>Rất mong được đón tiếp bạn tại nhà hàng!</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>L'Entrecôte Saigon</strong></p>
              ${IS_TEST_MODE ? '<hr><p style="color:red">ĐÂY LÀ EMAIL THỬ NGHIỆM (TEST MODE). KHÁCH HÀNG THỰC TẾ KHÔNG NHẬN ĐƯỢC MAIL NÀY.</p>' : ''}
            </div>`
          });
          
          if (!emailRes.success) {
            console.error('Email error', emailRes.error);
            errorMsg = `Lỗi gửi mail xác nhận: ${emailRes.error?.message || emailRes.error}`;
          }
        }
        
      } else if (action === 'reschedule') {
        const promptText = `Vui lòng nhập giờ muốn đổi cho đơn #${reservationId} (Reply tin nhắn này):`;
        await sendForceReplyMessage(messageId, promptText);
        if (cbQueryId) {
          await answerTelegramCallbackQuery(cbQueryId, "Đang chờ nhập giờ...");
        }
        // Do not update DB or push to Google Sheets for reschedule yet.
        return NextResponse.json({ ok: true });
      }

      // Update Database (only for Yes/Confirm since Reschedule returns early)
      const { error: updateError } = await serviceClient.from('reservations').update({ status: newStatus }).eq('id', reservationId);
      if (updateError) {
        errorMsg = `Lỗi cập nhật CSDL: ${updateError.message}`;
      }
      
      // Stop the loading icon on the button
      if (cbQueryId) {
        await answerTelegramCallbackQuery(cbQueryId, "Đã ghi nhận!");
      }

      // Reply to Telegram
      if (messageId) {
        await replyToTelegramMessage(messageId, replyText);
      }

      // If there were soft errors (like email failing), send a warning to the group
      if (errorMsg && chatId) {
        await sendTelegramMessage(`⚠️ <b>Cảnh báo lỗi:</b>\nQuá trình xử lý đơn ${reservationId} bị lỗi một phần:\n<code>${errorMsg}</code>`);
      }
    }
    
    // Always acknowledge Telegram quickly
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, "Lỗi Server nghiêm trọng!");
    if (chatId) await sendTelegramMessage(`❌ Lỗi Server nghiêm trọng tại Webhook:\n<code>${error.message}</code>`);
    return NextResponse.json({ ok: true });
  }
}
