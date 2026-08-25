const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const newSettings = [
    { key: 'is_test_mode', value: 'true' },
    { key: 'test_email', value: process.env.EMAIL_USER || 'admin@example.com' },
    { key: 'google_sheet_url', value: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '' },
    { key: 'test_google_sheet_url', value: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '' },
  ];

  for (const s of newSettings) {
    const { error } = await supabase.from('site_settings').insert(s);
    if (error) {
      if (error.code === '23505') {
        console.log(`Key ${s.key} already exists.`);
      } else {
        console.error(`Error inserting ${s.key}:`, error.message);
      }
    } else {
      console.log(`Inserted ${s.key} successfully.`);
    }
  }
}
main();
