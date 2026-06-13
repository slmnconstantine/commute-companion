const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkkmxlgpcfjdtmpjgojr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra214bGdwY2ZqZHRtcGpnb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzcyODAsImV4cCI6MjA5NTk1MzI4MH0.PUVLees9NoMwT6gHnPQI6h7orF_-APXwUDuJnLtVVg4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Try to insert a booking with a non-standard status to see if it triggers check constraint
  const { data, error } = await supabase.from('bookings').insert({
    trip_id: '00000000-0000-0000-0000-000000000000', // invalid uuid, will fail on fkey or check first
    commuter_id: '00000000-0000-0000-0000-000000000000',
    pickup_lat: 0,
    pickup_lng: 0,
    dropoff_lat: 0,
    dropoff_lng: 0,
    status: 'driver_confirmed',
    fare_paid: 0,
    platform_fee: 0
  }).select();
  
  console.log('Error message:', error ? error.message : 'No error');
  console.log('Error code:', error ? error.code : 'No code');
  console.log('Error details:', error ? error.details : 'No details');
}

test();
