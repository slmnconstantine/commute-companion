import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
  const { data, error } = await supabase.from('reviews').select('*').limit(1);
  console.log('Reviews table check:');
  console.log('Error:', error);
  console.log('Data:', data);
}

checkReviews();
