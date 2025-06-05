import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    // Log what we're using (without exposing the full key)
    console.log('URL:', supabaseUrl);
    console.log('Key first 20 chars:', supabaseKey?.substring(0, 20));
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query
    const { data, error } = await supabase
      .from('mrc_critical_rules')
      .select('count')
      .single();
    
    res.status(200).json({
      success: !error,
      data: data,
      error: error?.message || null,
      error_details: error
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
