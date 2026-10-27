/**
 * Utility kiểm tra danh sách Model Gemini khả dụng của API Key
 */
export async function getAvailableGeminiModels(apiKey) {
  if (!apiKey) {
    throw new Error('Chưa cung cấp GEMINI_API_KEY');
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || 'Lỗi khi kết nối Google AI Studio');
  }

  // Lọc các model hỗ trợ generateContent
  const chatModels = (data.models || []).filter(m => 
    m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
  );

  return chatModels.map(m => ({
    name: m.name.replace('models/', ''),
    displayName: m.displayName,
    description: m.description,
    version: m.version
  }));
}
