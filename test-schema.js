const fetch = require('node-fetch');

async function run() {
  try {
    const res = await fetch('https://fkkmxlgpcfjdtmpjgojr.supabase.co');
    const schema = await res.json();
    console.log('Available tables in database:', Object.keys(schema.definitions));
    
    // Print details of the 'routes' table columns
    if (schema.definitions.routes) {
      console.log('Routes columns:', Object.keys(schema.definitions.routes.properties));
    }
  } catch (e) {
    console.error('Error fetching OpenAPI schema:', e);
  }
}

run();
