const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkkmxlgpcfjdtmpjgojr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra214bGdwY2ZqZHRtcGpnb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzcyODAsImV4cCI6MjA5NTk1MzI4MH0.PUVLees9NoMwT6gHnPQI6h7orF_-APXwUDuJnLtVVg4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Error:', error);
  console.log('Total profiles:', data.length);
  data.forEach((p, index) => {
    console.log(`[${index}] ID: ${p.id}, Name: ${p.full_name}, Username: ${p.username}, Role: ${p.role}, Verified: ${p.is_verified}, Badge: ${p.verified_badge}, ID Url: ${p.government_id_url}`);
  });
}

test();
