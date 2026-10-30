import { NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateChatReply } from '@/lib/bot/geminiService';
import { handleConfirmBooking, handleRescheduleBooking, formatDateForSheet } from '@/lib/bot/bookingHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

// Hàm hỗ trợ delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Gửi tin nhắn Facebook Messenger cho khách qua Graph API
 */
async function sendFacebookMessage(psid, text, pageAccessToken) {
  if (!pageAccessToken || !psid || !text) return;
  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: text },
      messaging_type: 'RESPONSE'
    })
  });
  const data = await response.json();
  if (data.error) {
    console.error('Lỗi khi gửi Facebook message:', data.error);
  }
  return data;
}

/**
 * GET Handler: Xác thực Meta Webhook khi cài đặt trên Facebook Developer Portal
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || 'lentrecote_bot_verify_token_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Meta Webhook xác thực thành công!');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * Xử lý ngầm hội thoại của khách sau khi đã trả 200 OK cho Meta
 */
async function processIncomingMessage({ senderPsid, text, platform }) {
  try {
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
      console.error('Thiếu FACEBOOK_PAGE_ACCESS_TOKEN');
      return;
    }

    let botCustomPrompt = '';
    let isTestMode = false;
    let sheetUrl = null;
    let teleChatId = process.env.TELEGRAM_CHAT_ID;

    // 0. Kiểm tra Cài đặt Site Settings (Bật/Tắt Bot & Chế độ Test Whitelist)
    try {
      const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
      if (settingsData) {
        const settings = {};
        settingsData.forEach(s => settings[s.key] = s.value);
        botCustomPrompt = settings.bot_system_prompt || '';
        isTestMode = settings.facebook_test_mode === 'true';
        sheetUrl = isTestMode ? settings.test_google_sheet_url : settings.google_sheet_url;
        if (isTestMode && settings.facebook_test_chat_id) {
          teleChatId = settings.facebook_test_chat_id;
        }

        // Nếu Bot bị tắt trong Admin Settings
        if (settings.facebook_bot_active === 'false') {
          console.log('Bot đang ở chế độ TẮT (facebook_bot_active = false)');
          return;
        }

        // Nếu bật chế độ Whitelist (Chỉ cho phép Tester thử nghiệm)
        if (settings.facebook_whitelist_only === 'true') {
          const whitelist = (settings.facebook_whitelist_psids || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

          // Nếu có danh sách whitelist mà PSID hiện tại không nằm trong đó thì bỏ qua
          if (whitelist.length > 0 && !whitelist.includes(senderPsid)) {
            console.log(`PSID ${senderPsid} không nằm trong danh sách Whitelist Tester. Bỏ qua không trả lời.`);
            return;
          }
        }
      }
    } catch (settingsErr) {
      console.error('Lỗi khi kiểm tra site_settings trong meta-webhook:', settingsErr);
    }

    // 1. Kiểm tra / Khởi tạo Conversation trong Database
    let { data: conv } = await serviceClient
      .from('bot_conversations')
      .select('*')
      .eq('sender_psid', senderPsid)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await serviceClient
        .from('bot_conversations')
        .insert([{ sender_psid: senderPsid, platform: platform }])
        .select()
        .single();
      conv = newConv;
    }

    // 2. Kiểm tra Human Handover: Nếu nhân viên đang chat tay (paused_until còn hiệu lực) -> bỏ qua
    if (conv?.paused_until && new Date(conv.paused_until) > new Date()) {
      console.log(`Bot đang tạm dừng do nhân viên chat tay với PSID ${senderPsid}`);
      return;
    }

    // 3. Cơ chế Debounce gom tin nhắn (Đợi 5 giây theo yêu cầu để gom các câu ngắn liên tiếp)
    // Lưu tin nhắn hiện tại vào hàng đợi
    const queueId = crypto.randomUUID();
    await serviceClient.from('bot_message_queue').insert([{
      id: queueId,
      sender_psid: senderPsid,
      message_text: text,
      platform: platform
    }]);

    await sleep(5000); // Đợi 5 giây gom tin nhắn phản hồi nhanh và tự nhiên

    // Kiểm tra xem tin nhắn này có phải là tin nhắn cuối cùng trong chuỗi debounce không
    const { data: queuedMessages } = await serviceClient
      .from('bot_message_queue')
      .select('*')
      .eq('sender_psid', senderPsid)
      .order('created_at', { ascending: true });

    if (!queuedMessages || queuedMessages.length === 0) return;

    // Chỉ thực hiện xử lý nếu queueId này là tin nhắn cuối cùng trong danh sách
    const lastMsg = queuedMessages[queuedMessages.length - 1];
    if (lastMsg.id !== queueId) {
      // Có tin nhắn mới hơn đang đợi trong chuỗi debounce, request này kết thúc để request sau xử lý
      return;
    }

    // Gom toàn bộ nội dung trong chuỗi debounce thành 1 tin hoàn chỉnh
    const combinedText = queuedMessages.map(m => m.message_text.trim()).filter(Boolean).join('\n');

    // Xóa các tin đã gom khỏi hàng đợi
    const idsToDelete = queuedMessages.map(m => m.id);
    await serviceClient.from('bot_message_queue').delete().in('id', idsToDelete);

    if (!combinedText) return;

    // 3.5. Kiểm tra đơn đặt bàn hiện có của khách (hôm nay hoặc tương lai)
    const now = new Date();
    const vnNow = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60 * 1000);
    const todayIso = vnNow.toISOString().split('T')[0];

    const { data: activeReservations } = await serviceClient
      .from('reservations')
      .select('*')
      .eq('psid', senderPsid)
      .gte('date', todayIso)
      .in('status', ['pending', 'confirmed', 'reschedule_proposed'])
      .order('created_at', { ascending: false })
      .limit(1);

    const activeReservation = activeReservations?.[0] || null;

    // XỬ LÝ KỊCH BẢN B: Khách đồng ý với đề xuất đổi giờ từ nhà hàng (reschedule_proposed)
    if (activeReservation && activeReservation.status === 'reschedule_proposed') {
      const isAffirmative = /^(ok|oke|okie|oki|được|đồng ý|dong y|yes|yep|cảm ơn|cam on|thanks|thank you|chuẩn|chuan|chốt|chot|dạ được|da duoc|dạ ok|da ok|ok em|ok bạn|ok nha|được em|được nha|ok anh|ok chị|nhất trí|nhat tri)[\s.!?,]*$/i.test(combinedText.trim()) ||
        /^(ok|oke|okie|được|đồng ý|yes)\b/i.test(combinedText.trim());

      if (isAffirmative) {
        console.log(`👍 Khách ${senderPsid} đồng ý đổi giờ cho đơn ${activeReservation.id}`);
        const propMatch = (activeReservation.note || '').match(/\[Đề xuất đổi:\s*([^\]]+)\]/);
        const proposedTime = propMatch ? propMatch[1].trim() : activeReservation.time;

        const cleanNote = (activeReservation.note || '').replace(/\[Đề xuất đổi:\s*[^\]]+\]/g, '').trim();
        const finalNote = `${cleanNote} [Khách đồng ý đổi sang: ${proposedTime}]`.trim();

        // Cập nhật CSDL
        await serviceClient
          .from('reservations')
          .update({
            time: proposedTime,
            status: 'confirmed',
            note: finalNote
          })
          .eq('id', activeReservation.id);

        // Gửi tin nhắn Facebook xác nhận cho khách
        const confirmMsg = `Dạ, L'Entrecôte đã xác nhận lịch đặt bàn của anh/chị vào lúc ${proposedTime} ngày ${formatDateForSheet(activeReservation.date)}. Nhà hàng rất hân hạnh được phục vụ anh/chị! | L'Entrecôte has confirmed your reservation at ${proposedTime} on ${formatDateForSheet(activeReservation.date)}. We look forward to welcoming you!`;
        await sendFacebookMessage(senderPsid, confirmMsg, pageAccessToken);

        // Lưu tin nhắn bot vào DB
        await serviceClient.from('bot_messages').insert([{
          conversation_id: conv.id,
          role: 'model',
          content: confirmMsg
        }]);

        // Bắn thông báo Telegram cho nhân viên
        const botToken = process.env.FACEBOOK_TELEGRAM_BOT_TOKEN;
        if (botToken && teleChatId) {
          try {
            const teleMsg = `✅ <b>KHÁCH ĐÃ ĐỒNG Ý ĐỔI SANG ${escapeHtml(proposedTime)}</b>\n\n` +
              `👤 <b>Khách hàng:</b> ${escapeHtml(activeReservation.full_name)}\n` +
              `📞 <b>Số điện thoại:</b> ${escapeHtml(activeReservation.phone || 'N/A')}\n` +
              `📅 <b>Ngày:</b> ${formatDateForSheet(activeReservation.date)}\n` +
              `⏰ <b>Giờ mới:</b> <b>${escapeHtml(proposedTime)}</b> (Giờ cũ: ${escapeHtml(activeReservation.time)})\n` +
              `👥 <b>Số khách:</b> ${activeReservation.guests} người\n\n` +
              `📝 <i>Hệ thống đã tự động xác nhận đơn và cập nhật trên Google Sheet!</i>`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: teleChatId,
                text: teleMsg,
                parse_mode: 'HTML'
              })
            });
          } catch (teleErr) {
            console.error('Error sending Telegram reschedule confirmation:', teleErr);
          }
        }

        // Đồng bộ cập nhật lên Google Sheet
        if (sheetUrl) {
          try {
            await fetch(sheetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loai_xu_ly: "Reschedule",
                ngay_dat: formatDateForSheet(activeReservation.date),
                ten_khach: activeReservation.full_name,
                so_dien_thoai: activeReservation.phone,
                gio_dat_moi: proposedTime,
                gio_dat_cu: activeReservation.time,
                ghi_chu: cleanNote // Chỉ gửi ghi chú thực tế của khách (nếu có), không chèn text hệ thống
              })
            });
          } catch (sheetErr) {
            console.error('Error syncing reschedule to Google Sheets:', sheetErr);
          }
        }

        return; // Đã xử lý xong, không cần gọi Gemini AI
      }
    }

    // 4. Lấy lịch sử hội thoại gần nhất (8 tin gần nhất)
    const { data: pastMsgs } = await serviceClient
      .from('bot_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(8);

    const history = (pastMsgs || []).reverse().map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Lưu tin nhắn của khách vào bảng bot_messages
    await serviceClient.from('bot_messages').insert([{
      conversation_id: conv.id,
      role: 'user',
      content: combinedText
    }]);

    // Chuẩn bị ngữ cảnh đơn hiện có (nếu khách đã có đơn đặt bàn trước đó)
    let activeReservationContext = '';
    if (activeReservation) {
      activeReservationContext = `
# THÔNG TIN ĐƠN ĐẶT BÀN HIỆN CÓ CỦA KHÁCH:
- Khách hàng ĐÃ CÓ đơn đặt bàn trong hệ thống:
  + Mã đơn (reservation_id): "${activeReservation.id}"
  + Tên khách: "${activeReservation.full_name}"
  + Số điện thoại: "${activeReservation.phone}"
  + Ngày đặt: "${formatDateForSheet(activeReservation.date)}"
  + Giờ đặt hiện tại: "${activeReservation.time}"
  + Số khách: ${activeReservation.guests} người
  + Trạng thái đơn: "${activeReservation.status}"
- QUY TẮC BẮT BUỘC KHI XỬ LÝ:
  + Nếu khách yêu cầu đổi giờ, đổi ngày, hoặc đổi số lượng khách của đơn này (ví dụ: "cho mình đổi sang 20h", "dời lịch sang mai..."):
    * Hãy xác nhận nhẹ nhàng với khách rằng đã ghi nhận đổi giờ/ngày mới.
    * BẮT BUỘC GỌI TOOL "reschedule_booking" với reservation_id = "${activeReservation.id}", new_time, new_date (nếu có).
    * TUYỆT ĐỐI KHÔNG GỌI TOOL "confirm_booking" vì sẽ tạo ra đơn mới trùng lặp!
`;
    }

    // 5. Gọi Gemini AI sinh câu trả lời
    console.log(`🤖 Đang gọi Gemini AI cho khách ${senderPsid}: "${combinedText}"`);
    const aiResult = await generateChatReply({ 
      history, 
      userMessage: combinedText, 
      customPrompt: botCustomPrompt,
      activeReservationContext
    });

    // 6. Xử lý kết quả trả về
    if (aiResult.functionCall && aiResult.functionCall.name === 'confirm_booking') {
      const bookingArgs = aiResult.functionCall.args;
      console.log('🎉 Gemini kích hoạt chốt bàn mới:', bookingArgs);

      // Tạo đơn và bắn sang Telegram
      await handleConfirmBooking({
        bookingData: bookingArgs,
        senderPsid: senderPsid,
        platform: platform
      });

      // Tin nhắn chào kết thúc
      const closeMsg = "Dạ, nhà hàng đã ghi nhận lịch của anh/chị, sẽ có nhân viên liên hệ xác nhận chi tiết sớm ạ. Hẹn gặp anh/chị tại L'Entrecôte! | We have received your booking request, our staff will contact you shortly to confirm details. See you at L'Entrecôte!";
      await sendFacebookMessage(senderPsid, closeMsg, pageAccessToken);

      // Lưu tin nhắn bot vào DB
      await serviceClient.from('bot_messages').insert([{
        conversation_id: conv.id,
        role: 'model',
        content: closeMsg
      }]);
    } else if (aiResult.functionCall && aiResult.functionCall.name === 'reschedule_booking') {
      const rescheduleArgs = aiResult.functionCall.args;
      console.log('🔄 Gemini kích hoạt đổi giờ đặt bàn:', rescheduleArgs);

      await handleRescheduleBooking({
        rescheduleData: rescheduleArgs,
        senderPsid: senderPsid,
        platform: platform,
        originalReservation: activeReservation
      });

      const displayTime = rescheduleArgs.new_time || 'mới';
      const displayDate = rescheduleArgs.new_date || formatDateForSheet(activeReservation?.date);
      const closeMsg = `Dạ, em đã ghi nhận yêu cầu đổi lịch của anh/chị sang lúc ${displayTime} ngày ${displayDate} ạ. Quản lý nhà hàng sẽ liên hệ xác nhận lại sớm nhé ạ! | We have noted your request to reschedule to ${displayTime} on ${displayDate}. Our manager will confirm with you shortly!`;
      await sendFacebookMessage(senderPsid, closeMsg, pageAccessToken);

      await serviceClient.from('bot_messages').insert([{
        conversation_id: conv.id,
        role: 'model',
        content: closeMsg
      }]);
    } else if (aiResult.text) {
      // Gửi câu trả lời của AI cho khách
      await sendFacebookMessage(senderPsid, aiResult.text, pageAccessToken);

      // Lưu tin nhắn bot vào DB
      await serviceClient.from('bot_messages').insert([{
        conversation_id: conv.id,
        role: 'model',
        content: aiResult.text
      }]);
    }
  } catch (err) {
    console.error('Lỗi trong quá trình xử lý tin nhắn bot:', err);
  }
}

/**
 * Xử lý khi nhân viên Fanpage nhắn tin trực tiếp trên Meta Business Suite
 */
async function handleHumanHandover(recipientPsid) {
  try {
    // Tạm dừng bot trong 30 phút cho khách hàng này
    const pauseTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await serviceClient
      .from('bot_conversations')
      .upsert({
        sender_psid: recipientPsid,
        paused_until: pauseTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'sender_psid' });

    console.log(`⏸️ Nhân viên đã chat trực tiếp. Bot tạm dừng 30 phút cho PSID: ${recipientPsid}`);
  } catch (err) {
    console.error('Lỗi khi set Human Handover:', err);
  }
}

/**
 * POST Handler: Nhận Webhook Events từ Facebook & Instagram
 */
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Meta Webhook POST event received:', JSON.stringify(body));

    // Lưu log sự kiện để debug
    try {
      await serviceClient.from('bot_webhook_logs').insert([{
        event_type: body.object,
        payload: body
      }]);
    } catch (logErr) {
      console.error('Lỗi lưu bot_webhook_logs:', logErr);
    }

    // 1. Kiểm tra đối tượng webhook
    if (body.object === 'page' || body.object === 'instagram') {
      const platform = body.object === 'instagram' ? 'instagram' : 'facebook';

      for (const entry of body.entry || []) {
        for (const messagingEvent of entry.messaging || []) {
          // Bắt sự kiện nhân viên chat tay (is_echo = true)
          if (messagingEvent.message?.is_echo) {
            const recipientPsid = messagingEvent.recipient?.id;
            if (recipientPsid) {
              await handleHumanHandover(recipientPsid);
            }
            continue;
          }

          // Bắt sự kiện khách hàng gửi tin nhắn văn bản
          const senderPsid = messagingEvent.sender?.id;
          const text = messagingEvent.message?.text;

          if (senderPsid && text) {
            // Dùng after() để Next.js giữ serverless runtime sống trong 10s gom tin nhắn
            after(async () => {
              await processIncomingMessage({ senderPsid, text, platform });
            });
          }
        }
      }

      // TRẢ VỀ 200 OK NGAY LẬP TỨC CHO META (trong vòng 0.05 giây)
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('Lỗi Meta Webhook POST:', error);
    return new Response('EVENT_RECEIVED', { status: 200 });
  }
}
