import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workflow_name, service_tier = 'all', context = {}, max_memories = 500 } = req.body;
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing Supabase configuration',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sessionId = `mrc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Test with a simple query first
    const { data: testData, error: testError } = await supabase
      .from('mrc_critical_rules')
      .select('*')
      .limit(1);

    if (testError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection failed',
        details: testError.message
      });
    }

    // Continue with the rest of the function...
    const { data: criticalRules } = await supabase
      .from('mrc_critical_rules')
      .select('rule_text, service_tier, severity')
      .eq('is_active', true)
      .or(`service_tier.eq.${service_tier},service_tier.eq.all`)
      .order('severity', { ascending: false })
      .limit(50);

    res.json({
      success: true,
      session_id: sessionId,
      memory: `Test successful! Found ${criticalRules?.length || 0} critical rules.`,
      test_data: testData,
      critical_rules: criticalRules
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
