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
    },
    {
      name: "cancel_booking",
      description: "CHỈ gọi hàm này khi khách ĐÃ CÓ ĐƠN ĐẶT BÀN TRƯỚC ĐÓ và khách nhắn tin yêu cầu HUỶ ĐẶT BÀN (ví dụ: bận đột xuất, không đến được, muốn huỷ đơn).",
      parameters: {
        type: "OBJECT",
        properties: {
          reservation_id: {
            type: "STRING",
            description: "Mã ID đơn đặt bàn hiện có của khách hàng"
          },
          reason: {
            type: "STRING",
            description: "Lý do khách báo huỷ bàn (nếu khách có chia sẻ, nếu không có thì để rỗng)"
          }
        },
        required: ["reservation_id"]
      }
    }
  ]
};

// Biến đếm xoay vòng (Round-Robin) giữa các API Key
let keyRotationIndex = 0;

/**
 * Thu thập danh sách tất cả Gemini API Keys được cấu hình
 * Hỗ trợ:
 * - GEMINI_API_KEY="key1,key2,key3" (ngăn cách bằng dấu phẩy)
 * - GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3...
 */
export function getGeminiApiKeys() {
  const rawKeys = [
    process.env.GEMINI_API_KEY || '',
    process.env.GEMINI_API_KEY_1 || '',
    process.env.GEMINI_API_KEY_2 || '',
    process.env.GEMINI_API_KEY_3 || '',
    process.env.GEMINI_API_KEY_4 || '',
  ];

  const keys = [];
  for (const raw of rawKeys) {
    const parts = raw.split(',').map(k => k.trim()).filter(Boolean);
    for (const k of parts) {
      if (!keys.includes(k)) {
        keys.push(k);
      }
    }
  }
  return keys;
}

/**
 * Gọi Gemini API với System Instruction, History, Tool Declaration và cơ chế Xoay tua Key (Key Rotation + Failover)
 */
export async function generateChatReply({ history = [], userMessage, customPrompt = '', activeReservationContext = '' }) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
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
  const fallbackCandidates = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-flash'];
  const modelsToTry = [primaryModel, ...fallbackCandidates.filter(m => m !== primaryModel)];

  const callModelWithKey = async (model, key) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  };

  // Xác định vị trí key bắt đầu theo Round-Robin để chia đều tải
  const startIdx = keyRotationIndex % apiKeys.length;
  keyRotationIndex = (keyRotationIndex + 1) % apiKeys.length;

  let data = null;
  let lastError = null;

  // Thử xoay tua qua từng API Key; với mỗi Key thử primaryModel rồi fallbackModel
  outerLoop:
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKeyIdx = (startIdx + i) % apiKeys.length;
    const currentKey = apiKeys[currentKeyIdx];
    const maskedKey = `${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`;

    for (const model of modelsToTry) {
      try {
        const resData = await callModelWithKey(model, currentKey);
        if (!resData.error) {
          data = resData;
          break outerLoop;
        }

        lastError = resData.error;
        const status = resData.error.code || resData.error.status;
        console.warn(`[Gemini Rotation] Key #${currentKeyIdx + 1} (${maskedKey}) | Model ${model} gặp lỗi (${status}): ${resData.error.message}`);

        // Nếu lỗi liên quan đến API Key không hợp lệ hoặc hết Quota (400 API_KEY_INVALID, 403, 429),
        // nhảy ngay sang Key tiếp theo thay vì thử model khác trên cùng Key lỗi
        if (
          resData.error.code === 429 ||
          resData.error.code === 403 ||
          (resData.error.message && /API key not valid|quota|rate limit|RESOURCE_EXHAUSTED/i.test(resData.error.message))
        ) {
          break;
        }
      } catch (networkErr) {
        lastError = { message: networkErr.message };
        console.warn(`[Gemini Rotation] Key #${currentKeyIdx + 1} (${maskedKey}) lỗi mạng:`, networkErr.message);
        break;
      }
    }
  }

  if (!data || data.error) {
    const errObj = data?.error || lastError;
    console.error('All Gemini API Keys failed:', errObj);
    throw new Error(`Gemini API Error: ${errObj?.message || JSON.stringify(errObj)}`);
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
