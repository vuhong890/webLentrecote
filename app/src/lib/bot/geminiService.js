import { buildSystemInstruction } from './botPrompt.js';

const BOOKING_TOOL = {
  functionDeclarations: [
    {
      name: "confirm_booking",
      description: "CHỈ gọi hàm này khi khách muốn ĐẶT BÀN MỚI và ĐÃ CUNG CẤP ĐỦ 5 thông tin bắt buộc (Tên, SĐT, Ngày, Giờ, Số khách) VÀ khách ĐÃ XÁC NHẬN ĐỒNG Ý chốt đặt bàn (nhắn 'đúng', 'ok', 'chuẩn', 'yes', 'confirm', 'chính xác'). Tuyệt đối không tự ý gọi khi khách chưa xác nhận hoặc khi khách muốn đổi lịch đơn cũ.",
      parameters: {
        type: "OBJECT",
        properties: {
          customer_name: {
            type: "STRING",
            description: "Tên của khách hàng"
          },
          phone_number: {
            type: "STRING",
            description: "Số điện thoại đã làm sạch (10 chữ số bắt đầu bằng 0 cho VN, hoặc có dấu + cho quốc tế)"
          },
          booking_date: {
            type: "STRING",
            description: "Ngày đặt bàn theo định dạng YYYY-MM-DD hoặc DD/MM/YYYY"
          },
          booking_time: {
            type: "STRING",
            description: "Giờ đặt bàn theo định dạng HH:mm (ví dụ 19:00, 12:30)"
          },
          guest_count: {
            type: "INTEGER",
            description: "Số lượng khách (số người)"
          },
          notes: {
            type: "STRING",
            description: "Yêu cầu đặc biệt (sinh nhật, dị ứng, vị trí ngồi...). Nếu không có thì để rỗng."
          }
        },
        required: ["customer_name", "phone_number", "booking_date", "booking_time", "guest_count"]
      }
    },
    {
      name: "reschedule_booking",
      description: "CHỈ gọi hàm này khi khách ĐÃ CÓ ĐƠN ĐẶT BÀN TRƯỚC ĐÓ và khách muốn thay đổi giờ đặt bàn, ngày đặt bàn, hoặc số lượng khách (dời lịch / reschedule).",
      parameters: {
        type: "OBJECT",
        properties: {
          reservation_id: {
            type: "STRING",
            description: "Mã ID đơn đặt bàn hiện có của khách hàng (lấy từ thông tin đơn hiện có)"
          },
          new_time: {
            type: "STRING",
            description: "Giờ đặt bàn mới của khách (ví dụ 20:00, 20:30)"
          },
          new_date: {
            type: "STRING",
            description: "Ngày đặt bàn mới (định dạng DD/MM/YYYY hoặc YYYY-MM-DD), chỉ điền nếu khách muốn đổi ngày"
          },
          guest_count: {
            type: "INTEGER",
            description: "Số lượng khách mới, chỉ điền nếu khách muốn đổi số người"
          },
          notes: {
            type: "STRING",
            description: "Lý do hoặc ghi chú dời lịch của khách"
          }
        },
        required: ["reservation_id", "new_time"]
      }
    }
  ]
};

/**
 * Gọi Gemini API với System Instruction, History và Tool Declaration
 */
export async function generateChatReply({ history = [], userMessage, customPrompt = '', activeReservationContext = '' }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong .env.local');
  }

  let systemInstruction = buildSystemInstruction(customPrompt);
  if (activeReservationContext) {
    systemInstruction += '\n\n' + activeReservationContext;
  }

  // Chuẩn bị payload contents
  const contents = [...history];
  if (userMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
    tools: [BOOKING_TOOL],
    generationConfig: {
      temperature: 0.2, // Giữ độ chính xác cao, không bịa chuyện
      topP: 0.8,
      maxOutputTokens: 4096,
      thinkingConfig: {
        thinkingBudget: 0 // Tắt thinking nội tâm để dành 100% token cho câu trả lời, phản hồi siêu tốc và không bao giờ bị cắt cụt câu
      }
    }
  };

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const fallbackModel = 'gemini-2.5-flash';

  const callModel = async (model) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  };

  let data = await callModel(primaryModel);
  if (data.error && primaryModel !== fallbackModel) {
    console.warn(`Model ${primaryModel} gặp sự cố (${data.error.message}), tự động fallback sang ${fallbackModel}...`);
    data = await callModel(fallbackModel);
  }

  if (data.error) {
    console.error('Gemini API Error:', data.error);
    throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.content?.parts?.length) {
    return {
      text: "Dạ, em chào anh/chị! Em là lễ tân của nhà hàng L'Entrecôte Social Meating, em có thể giúp gì cho anh/chị hôm nay ạ? | Hello! I am the receptionist at L'Entrecôte Social Meating, how may I assist you today?"
    };
  }

  // Kiểm tra xem candidate có gọi Function Tool không
  for (const part of candidate.content.parts) {
    if (part.functionCall) {
      return {
        functionCall: {
          name: part.functionCall.name,
          args: part.functionCall.args
        }
      };
    }
  }

  // Nếu là text thông thường
  const replyText = candidate.content.parts.map(p => p.text || '').join('\n').trim();
  return { text: replyText };
}
