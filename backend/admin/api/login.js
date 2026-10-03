// Vercel Serverless Function: /api/login
module.exports = async (req, res) => {
  // Set security and CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Use POST.'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const submittedPassword = (body && body.password) ? String(body.password).trim() : '';
    const configuredPassword = (
      process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_SECRET ||
      'admin123'
    ).trim();

    if (!submittedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (submittedPassword !== configuredPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password'
      });
    }

    // Password verified: return Supabase configuration
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      config: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
};
