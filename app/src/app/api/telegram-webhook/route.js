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

    // 2. Check if this is a Telegram callback_query (button click)
    if (body.callback_query) {
      const cb = body.callback_query;
      cbQueryId = cb.id; // Important: for answering the callback
      chatId = cb.message?.chat?.id;
      
      const data = cb.data; // e.g., "confirm_123"
      const messageId = cb.message?.message_id;
      const userFullName = `${cb.from.first_name || ''} ${cb.from.last_name || ''}`.trim() || cb.from.username || 'Admin';
      
      let action = '';
      let reservationId = '';
      let newTime = '';

      if (data.startsWith('confirm_')) {
        action = 'confirm';
        reservationId = data.substring(8);
      } else if (data.startsWith('reschedule_')) {
        action = 'reschedule';
        reservationId = data.substring(11);
      } else if (data.startsWith('newtime_')) {
        action = 'newtime';
        const parts = data.split('_');
        reservationId = parts[1];
        newTime = parts[2];
      }
      
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
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #c9a756; text-transform: uppercase;">L'Entrecôte - Social Meating</h2>
              </div>

              <p>Xin chào <strong>${reservation.full_name}</strong>,</p>
              <p>Cảm ơn anh/chị đã lựa chọn L’Entrecôte – Social Meating.<br/>
              Nhà hàng xác nhận thông tin đặt bàn của anh/chị như sau:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9f9f9;">
                <tr><td style="padding: 10px; border: 1px solid #ddd; width: 40%;"><strong>Tên khách:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.full_name}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Ngày:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatDateForSheet(reservation.date)}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Giờ:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.time}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Số lượng khách:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.guests}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Yêu cầu đặc biệt (không đảm bảo):</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.note || 'Không có'}</td></tr>
              </table>

              <p><strong>Thông tin gửi xe:</strong><br/>
              Chỗ đậu xe máy tùy thuộc vào tình trạng chỗ trống:</p>
              <ul style="margin-top: 5px;">
                <li>55 Đông Du: 10.000 VNĐ / xe máy</li>
                <li>63 Đông Du: 20.000 VNĐ / xe máy</li>
                <li>Ô tô: khoảng 25.000–40.000 VNĐ / giờ</li>
              </ul>
              
              <p>Anh/chị có thêm yêu cầu hoặc cần thay đổi thông tin đặt bàn, vui lòng liên hệ với nhà hàng qua số <strong>032 7157002</strong>.</p>
              <p>Rất mong được chào đón quý khách tại L’Entrecôte – Social Meating.</p>
              <p>Trân trọng,<br/><strong>L’Entrecôte – Social Meating</strong></p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

              <p>Dear <strong>${reservation.full_name}</strong>,</p>
              <p>Thank you for choosing L’Entrecôte – Social Meating.<br/>
              We are pleased to confirm your reservation with the following details:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9f9f9;">
                <tr><td style="padding: 10px; border: 1px solid #ddd; width: 40%;"><strong>Guest Name:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.full_name}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatDateForSheet(reservation.date)}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.time}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Number of Guests:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.guests}</td></tr>
                <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Special Request (not guaranteed):</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${reservation.note || 'None'}</td></tr>
              </table>

              <p><strong>Parking Information:</strong><br/>
              Scooter parking is subject to availability:</p>
              <ul style="margin-top: 5px;">
                <li>55 Dong Du: 10,000 VND / motorbike</li>
                <li>63 Dong Du: 20,000 VND / motorbike</li>
                <li>Car parking: approximately 25,000–40,000 VND / hour</li>
              </ul>
              
              <p>If you have any additional requests or need to make changes to your reservation, please feel free to contact us at <strong>032 7157002</strong>.</p>
              <p>We look forward to welcoming you soon.</p>
              <p>Thank you and Best regards,<br/><strong>L’Entrecôte – Social Meating</strong></p>

              ${IS_TEST_MODE ? '<hr><p style="color:red; text-align:center;">ĐÂY LÀ EMAIL THỬ NGHIỆM (TEST MODE). KHÁCH HÀNG THỰC TẾ KHÔNG NHẬN ĐƯỢC MAIL NÀY.</p>' : ''}
            </div>`
          });
          
          if (!emailRes.success) {
            console.error('Email error', emailRes.error);
            errorMsg = `Lỗi gửi mail xác nhận: ${emailRes.error?.message || emailRes.error}`;
          }
        }
        
      } else if (action === 'reschedule') {
        const times = ["11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "4:00 PM", "5:00 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"];
        const inline_keyboard = [];
        for (let i = 0; i < times.length; i += 3) {
          const row = times.slice(i, i + 3).map(time => ({
            text: time,
            callback_data: `newtime_${reservationId}_${time}`
          }));
          inline_keyboard.push(row);
        }
        await sendTelegramMessage(`Vui lòng chọn khung giờ muốn đổi cho đơn #${reservationId}:`, { inline_keyboard });
        if (cbQueryId) {
          await answerTelegramCallbackQuery(cbQueryId, "Vui lòng chọn giờ bên dưới");
        }
        // Do not update DB or push to Google Sheets for reschedule yet.
        return NextResponse.json({ ok: true });
      } else if (action === 'newtime') {
        replyText = `✅ Đã gửi mail đề xuất đổi sang ${newTime} cho khách hàng.\n(Bởi: ${userFullName})`;
        if (IS_TEST_MODE) replyText += ' [TEST MODE]';
        
        // Send Email to customer
        if (reservation.email) {
          const emailTo = IS_TEST_MODE ? testEmail : reservation.email;
          const subjectPrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';

          const emailRes = await sendEmail({
            to: emailTo,
            subject: `${subjectPrefix}[L'Entrecôte] Gợi ý đổi giờ đặt bàn - ${formatDateForSheet(reservation.date)}`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #c9a756; text-transform: uppercase;">L'Entrecôte - Social Meating</h2>
              </div>

              <p>Xin chào <strong>${reservation.full_name}</strong>,</p>
              <p>Cảm ơn anh/chị đã lựa chọn L’Entrecôte – Social Meating.</p>
              <p>Nhà hàng rất tiếc rằng khung giờ <strong>${reservation.time}</strong> vào ngày <strong>${formatDateForSheet(reservation.date)}</strong> hiện đã kín bàn. Tuy nhiên, nhà hàng đề xuất khung giờ còn bàn trống lúc <strong>${newTime}</strong>.</p>
              <p>Nếu khung giờ trên phù hợp, anh/chị có thể <a href="https://www.lentrecotevietnam.com/reservation" style="color: #c9a756; text-decoration: none; font-weight: bold;">đặt bàn mới trực tiếp trên website của nhà hàng</a>, hoặc liên hệ hotline <strong>032 7157002</strong> để được hỗ trợ đặt bàn mới.</p>
              <p>L’Entrecôte - Social Meating thành thật xin lỗi vì sự bất tiện này.</p>
              <p>Rất mong sớm được chào đón anh/chị tại L’Entrecôte - Social Meating.</p>
              <p>Trân trọng,<br/><strong>L’Entrecôte – Social Meating</strong></p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

              <p>Dear <strong>${reservation.full_name}</strong>,</p>
              <p>Thank you for choosing L’Entrecôte – Social Meating.</p>
              <p>We are sorry to inform you that the requested time <strong>${reservation.time}</strong> on <strong>${formatDateForSheet(reservation.date)}</strong> is currently fully booked. However, we would be pleased to offer you an available alternative time at <strong>${newTime}</strong>.</p>
              <p>If the suggested time works for you, you may <a href="https://www.lentrecotevietnam.com/reservation" style="color: #c9a756; text-decoration: none; font-weight: bold;">make a new reservation directly through our website</a>, or contact our hotline at <strong>032 7157002</strong> for assistance with making a new reservation.</p>
              <p>L’Entrecôte – Social Meating sincerely apologizes for any inconvenience caused.</p>
              <p>We very much look forward to welcoming you soon at L’Entrecôte – Social Meating.</p>
              <p>Thank you and Best regards,<br/><strong>L’Entrecôte – Social Meating</strong></p>

              ${IS_TEST_MODE ? '<hr><p style="color:red; text-align:center;">ĐÂY LÀ EMAIL THỬ NGHIỆM (TEST MODE). KHÁCH HÀNG THỰC TẾ KHÔNG NHẬN ĐƯỢC MAIL NÀY.</p>' : ''}
            </div>`
          });

          if (!emailRes.success) {
            errorMsg = `Lỗi gửi mail đổi giờ: ${emailRes.error?.message || emailRes.error}`;
          }
        }

        // Do not update DB or push to Google Sheets for newtime (still pending)
        if (cbQueryId) await answerTelegramCallbackQuery(cbQueryId, `Đã báo đổi sang ${newTime}!`);
        if (messageId) await replyToTelegramMessage(messageId, replyText);
        if (errorMsg && chatId) await sendTelegramMessage(`⚠️ <b>Cảnh báo lỗi:</b>\nQuá trình xử lý đơn ${reservationId} bị lỗi:\n<code>${errorMsg}</code>`);
        
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
