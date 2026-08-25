import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { replyToTelegramMessage, answerTelegramCallbackQuery, sendTelegramMessage } from '@/lib/telegram';
import { sendEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

// Helper function to format YYYY-MM-DD to DD/MM/YYYY for Google Sheets
function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export async function POST(request) {
  let cbQueryId = null;
  let chatId = null;
  let errorMsg = null;

  try {
    const body = await request.json();
    
    // Check if this is a Telegram callback_query
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
          fetch(sheetUrl, {
            method: 'POST',
            body: JSON.stringify({
              loai_xu_ly: "Yes",
              ngay_dat: formatDateForSheet(reservation.date),
              ten_khach: reservation.full_name,
              so_nguoi: reservation.guests,
              gio_dat: reservation.time,
              ghi_chu: reservation.note,
              so_dien_thoai: reservation.phone
            })
          }).catch(err => console.error('Error pushing to sheet', err));
        }

        // Send Email
        if (reservation.email) {
          const emailTo = IS_TEST_MODE ? testEmail : reservation.email;
          const subjectPrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';
          
          await sendEmail({
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
          }).catch(err => {
            console.error('Email error', err);
            errorMsg = `Lỗi gửi mail xác nhận: ${err.message}`;
          });
        }
        
      } else if (action === 'reject') {
        newStatus = 'cancelled';
        replyText = `---------------------------\nTình trạng xử lý: ❌ No\n(Bởi: ${userFullName})`;
        if (IS_TEST_MODE) replyText += ' [TEST MODE]';
        
        // Send Rejection Email
        if (reservation.email) {
          const emailTo = IS_TEST_MODE ? testEmail : reservation.email;
          const subjectPrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';

          await sendEmail({
            to: emailTo,
            subject: `${subjectPrefix}[L'Entrecôte] Thông báo về đơn đặt bàn - ${formatDateForSheet(reservation.date)}`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Xin chào ${reservation.full_name},</h2>
              <p>L'Entrecôte rất xin lỗi phải thông báo rằng chúng tôi đã kín bàn vào lúc <strong>${reservation.time}</strong> ngày <strong>${formatDateForSheet(reservation.date)}</strong>.</p>
              <p>Mong bạn thông cảm và rất hy vọng được phục vụ bạn vào một dịp khác.</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>L'Entrecôte Saigon</strong></p>
              ${IS_TEST_MODE ? '<hr><p style="color:red">ĐÂY LÀ EMAIL THỬ NGHIỆM (TEST MODE). KHÁCH HÀNG THỰC TẾ KHÔNG NHẬN ĐƯỢC MAIL NÀY.</p>' : ''}
            </div>`
          }).catch(err => {
            console.error('Email error', err);
            errorMsg = `Lỗi gửi mail từ chối: ${err.message}`;
          });
        }
      } else if (action === 'change') {
        newStatus = 'pending';
        replyText = `---------------------------\nTình trạng xử lý: 🔄 Change\n(Bởi: ${userFullName})`;
        if (IS_TEST_MODE) replyText += ' [TEST MODE]';
        
        // Push to Google Sheets as Change
        if (sheetUrl) {
          fetch(sheetUrl, {
            method: 'POST',
            body: JSON.stringify({
              loai_xu_ly: "Change",
              ngay_dat: formatDateForSheet(reservation.date),
              ten_khach: reservation.full_name,
              so_nguoi: reservation.guests,
              gio_dat: reservation.time,
              ghi_chu: reservation.note,
              so_dien_thoai: reservation.phone
            })
          }).catch(err => console.error('Error pushing to sheet', err));
        }
      }

      // Update Database
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
