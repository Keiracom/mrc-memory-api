export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  res.status(200).json({
    url_exists: !!url,
    key_exists: !!key,
    url_value: url || 'NOT SET',
    key_first_10: key ? key.substring(0, 10) + '...' : 'NOT SET',
    key_last_10: key ? '...' + key.substring(key.length - 10) : 'NOT SET',
    expected_url: 'https://skcudwqqdqlobinjzjyw.supabase.co',
    key_looks_right: key && key.includes('service_role')
  });
}
