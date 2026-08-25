require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, serviceKey);

async function test() {
  try {
    const reservationId = 99999; // Fake ID
    console.log('1. Loading settings');
    const { data: settingsData, error: settingsError } = await serviceClient.from('site_settings').select('key, value');
    if (settingsError) throw settingsError;

    const settings = {};
    if (settingsData) {
      settingsData.forEach(s => settings[s.key] = s.value);
    }
    const IS_TEST_MODE = settings.is_test_mode === 'true';
    console.log('Test Mode:', IS_TEST_MODE);

    console.log('2. Fetching reservation');
    const { data: reservation, error: fetchError } = await serviceClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();
      
    if (fetchError || !reservation) {
      console.log('Reservation not found error:', fetchError);
      return;
    }
    
    console.log('Success!');
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}
test();
