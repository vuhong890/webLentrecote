import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Get the notification email from settings
    const settingsRes = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'notification_email')
      .single();

    const notificationEmail = settingsRes.data?.value;

    if (notificationEmail) {
      // 2. Send email notification
      const subject = `[L'Entrecôte] Tin nhắn mới từ ${name}`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #333; border-bottom: 2px solid #F0C75E; padding-bottom: 10px;">Tin Nhắn Mới Nhận (Contact Form)</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 120px;"><strong>Họ và Tên:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email Khách:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Nội dung:</strong></td>
              <td style="padding: 10px;"></td>
            </tr>
          </table>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #F0C75E; margin-top: 5px; white-space: pre-wrap;">${message}</div>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #888;">Email này được gửi tự động từ hệ thống website L'Entrecôte.</p>
        </div>
      `;

      await sendEmail({
        to: notificationEmail,
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
