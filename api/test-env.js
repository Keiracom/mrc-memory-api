export default async function handler(req, res) {
  try {
    res.status(200).json({
      message: "Environment test",
      has_url: !!process.env.SUPABASE_URL,
      has_key: !!process.env.SUPABASE_SERVICE_KEY,
      url_length: process.env.SUPABASE_URL?.length || 0,
      key_length: process.env.SUPABASE_SERVICE_KEY?.length || 0,
      node_env: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
