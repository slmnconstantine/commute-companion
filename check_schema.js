const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => {
    const parts = l.split('=');
    return [parts[0], parts.slice(1).join('=')];
  }));
  const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL.trim(), env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim());
  
  const { error: error1 } = await supabase.from('hub_posts').insert({
    author_id: '11111111-1111-1111-1111-111111111111',
    route_hash: 'test',
    status_tag: 'Tip',
    message: 'test',
    location_lat: 0,
    location_lng: 0
  });
  console.log('Tip:', error1.code, error1.message);

  const { error: error2 } = await supabase.from('hub_posts').insert({
    author_id: '11111111-1111-1111-1111-111111111111',
    route_hash: 'test',
    status_tag: 'tip',
    message: 'test',
    location_lat: 0,
    location_lng: 0
  });
  console.log('tip:', error2.code, error2.message);
}
run();
run();
