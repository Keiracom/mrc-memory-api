import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // Temporarily hardcode to test
    const supabaseUrl = 'https://skcudwqqdqlobinjzjyw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrY3Vkd3FxZHFsb2Jpbmp6anl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk4MDAzMiwiZXhwIjoyMDYzNTU2MDMyfQ.W-bOdV1uo6gLLoQQW6YBvCVJQ05rs8M9VCV9U1Gmh_c';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('mrc_critical_rules')
      .select('*')
      .limit(1);
    
    res.status(200).json({
      success: !error,
      data: data,
      error: error?.message || null
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message
    });
  }
}
