// Trigger recompile
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { sendEmail } from '@/lib/email';
import { sendTelegramMessage } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

// Client for public insert (using service key to bypass RLS)
const serviceClient = createClient(supabaseUrl, serviceKey);

// Client for checking user token
const authClient = createClient(supabaseUrl, anonKey);

function getAuthClient(token) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// GET reservations (admin — requires auth)
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify token
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const date = searchParams.get('date');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  // Pagination calculation
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = getAuthClient(token)
    .from('reservations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (status && status !== 'all') query = query.eq('status', status);
  if (date) query = query.eq('date', date);
  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

// POST create reservation (public)
export async function POST(request) {
  const body = await request.json();

  const { data, error } = await serviceClient
    .from('reservations')
    .insert({
      full_name: body.full_name,
      phone: body.phone,
      email: body.email || '',
      guests: body.guests || 2,
      date: body.date,
      time: body.time,
      branch: body.branch || '',
      note: body.note || '',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email notification (fire and forget)
  try {
    const { data: settingsData } = await serviceClient.from('site_settings').select('key, value');
    const settings = {};
    if (settingsData) {
      settingsData.forEach(s => settings[s.key] = s.value);
    }
    
    const IS_TEST_MODE = settings.is_test_mode === 'true';
    const notificationEmail = IS_TEST_MODE ? settings.test_email : settings.notification_email;
    const testModePrefix = IS_TEST_MODE ? '[TEST MODE] ' : '';
    const testModeWarning = IS_TEST_MODE ? '<div style="background-color: #fff1f0; border: 1px solid #ffa39e; padding: 10px; margin-bottom: 20px; color: #cf1322; border-radius: 4px;"><strong>⚠️ LƯU Ý:</strong> Đây là email gửi thử nghiệm (Test Mode). Khách hàng không có thật.</div>' : '';

    if (notificationEmail) {
      const subject = `${testModePrefix}[L'Entrecôte] Đặt bàn mới: ${body.full_name} (${body.date})`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
          ${testModeWarning}
          <h2 style="color: #333; border-bottom: 2px solid #F0C75E; padding-bottom: 10px;">Có Khách Đặt Bàn Mới</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 140px;"><strong>Tên khách hàng:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${body.full_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Số điện thoại:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${body.phone}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${body.email}">${body.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ngày đặt:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${body.date}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Giờ đặt:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${body.time}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Số lượng khách:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${body.guests} người</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ghi chú:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${body.note || 'Không có ghi chú'}</td>
            </tr>
          </table>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #888;">Email này được gửi tự động từ hệ thống website L'Entrecôte.</p>
        </div>
      `;

      // Đợi email gửi xong để đảm bảo không bị huỷ tác vụ ngầm (đặc biệt trên môi trường serverless như Vercel)
      await sendEmail({
        to: notificationEmail,
        subject,
        html,
      }).catch(err => console.error('Error in sendEmail async:', err));
      console.log(`[Reservation] New booking from ${body.full_name} — notify ${notificationEmail}`);
    }

    // Send Telegram Notification
    const createdDate = new Date(data.created_at);
    const bookedOn = `${createdDate.getDate().toString().padStart(2, '0')}/${(createdDate.getMonth()+1).toString().padStart(2, '0')}/${createdDate.getFullYear()} ${createdDate.getHours().toString().padStart(2, '0')}:${createdDate.getMinutes().toString().padStart(2, '0')}`;
    
    const text = `${testModePrefix}<b>Thông tin đặt bàn</b>
Tên: ${data.full_name}
SĐT: ${data.phone}
Email: ${data.email || 'Không có'}
Ngày: ${data.date}
Giờ: ${data.time}
Số khách: ${data.guests}
Ghi chú (Sinh nhật, ...): ${data.note || 'Không có'}
Đặt bàn tại web lúc: ${bookedOn}`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Yes', callback_data: `confirm_${data.id}` },
          { text: '❌ No', callback_data: `reject_${data.id}` },
          { text: '🔄 Change', callback_data: `change_${data.id}` }
        ]
      ]
    };
    
    await sendTelegramMessage(text, replyMarkup);

  } catch (e) {
    console.error('Failed to get notification email:', e);
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH update reservation status (admin)
export async function PATCH(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify token
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, status } = body;

  if (!['pending', 'confirmed', 'cancelled', 'arrived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await getAuthClient(token)
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT update reservation (admin edit all fields)
export async function PUT(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...updateData } = body;

  const { data, error } = await getAuthClient(token)
    .from('reservations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE reservation (admin)
export async function DELETE(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { error, count } = await getAuthClient(token)
    .from('reservations')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (count === 0) return NextResponse.json({ error: 'Reservation not found or RLS blocked delete' }, { status: 403 });
  return NextResponse.json({ success: true });
}
