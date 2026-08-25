import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { replyToTelegramMessage } from '@/lib/telegram';
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
  try {
    const body = await request.json();
    
    // Check if this is a Telegram callback_query
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data; // e.g., "confirm_123"
      const messageId = cb.message?.message_id;
      const userFullName = `${cb.from.first_name || ''} ${cb.from.last_name || ''}`.trim() || cb.from.username || 'Admin';
      
      const [action, reservationId] = data.split('_');
      
      if (!reservationId) return NextResponse.json({ ok: true });

      // Fetch reservation
      const { data: reservation, error: fetchError } = await serviceClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();
        
      if (fetchError || !reservation) {
        console.error('Reservation not found', fetchError);
        return NextResponse.json({ ok: true });
      }

      let newStatus = reservation.status;
      let replyText = '';
      
      if (action === 'confirm') {
        newStatus = 'confirmed';
        replyText = `---------------------------\nTình trạng xử lý: ✅ Yes\n(Bởi: ${userFullName})`;
        
        // Push to Google Sheets
        const sheetUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
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
          await sendEmail({
            to: reservation.email,
            subject: `[L'Entrecôte] Xác nhận đặt bàn - ${formatDateForSheet(reservation.date)}`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Xin chào ${reservation.full_name},</h2>
              <p>L'Entrecôte xin xác nhận đơn đặt bàn của bạn vào lúc <strong>${reservation.time}</strong> ngày <strong>${formatDateForSheet(reservation.date)}</strong> cho <strong>${reservation.guests}</strong> người đã được xác nhận thành công.</p>
              <p>Rất mong được đón tiếp bạn tại nhà hàng!</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>L'Entrecôte Saigon</strong></p>
            </div>`
          }).catch(err => console.error('Email error', err));
        }
        
      } else if (action === 'reject') {
        newStatus = 'cancelled';
        replyText = `---------------------------\nTình trạng xử lý: ❌ No\n(Bởi: ${userFullName})`;
        
        // Send Rejection Email
        if (reservation.email) {
          await sendEmail({
            to: reservation.email,
            subject: `[L'Entrecôte] Thông báo về đơn đặt bàn - ${formatDateForSheet(reservation.date)}`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Xin chào ${reservation.full_name},</h2>
              <p>L'Entrecôte rất xin lỗi phải thông báo rằng chúng tôi đã kín bàn vào lúc <strong>${reservation.time}</strong> ngày <strong>${formatDateForSheet(reservation.date)}</strong>.</p>
              <p>Mong bạn thông cảm và rất hy vọng được phục vụ bạn vào một dịp khác.</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>L'Entrecôte Saigon</strong></p>
            </div>`
          }).catch(err => console.error('Email error', err));
        }
      } else if (action === 'change') {
        newStatus = 'pending'; // or you can keep it as pending_change if you have that status
        replyText = `---------------------------\nTình trạng xử lý: 🔄 Change\n(Bởi: ${userFullName})`;
        
        // Push to Google Sheets as Change
        const sheetUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
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
      await serviceClient.from('reservations').update({ status: newStatus }).eq('id', reservationId);
      
      // Reply to Telegram
      if (messageId) {
        await replyToTelegramMessage(messageId, replyText);
      }
    }
    
    // Always acknowledge Telegram quickly
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Even on error, return 200 so Telegram doesn't keep retrying excessively
    return NextResponse.json({ ok: true });
  }
}
