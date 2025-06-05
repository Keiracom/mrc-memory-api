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
      return res.status(400).json({ error: 'Missing Supabase configuration' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sessionId = `mrc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 1. Load critical rules
    const { data: criticalRules } = await supabase
      .from('mrc_critical_rules')
      .select('rule_text, service_tier, severity')
      .eq('is_active', true)
      .or(`service_tier.eq.${service_tier},service_tier.eq.all`)
      .order('severity', { ascending: false })
      .limit(50);

    // 2. Load recent memories
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentMemories } = await supabase
      .from('mrc_memory_entries')
      .select('*')
      .eq('is_archived', false)
      .gte('created_at', thirtyDaysAgo)
      .gte('relevance_score', 70)
      .order('relevance_score', { ascending: false })
      .limit(Math.floor(max_memories * 0.7));

    // 3. Load compressed wisdom
    const { data: compressedWisdom } = await supabase
      .from('mrc_compressed_wisdom')
      .select('*')
      .or(`applies_to_tier.eq.${service_tier},applies_to_tier.eq.all`)
      .order('frequency', { ascending: false })
      .limit(20);

    // 4. Format memory
    const formattedMemory = formatMRCMemory({
      critical: criticalRules || [],
      recent: recentMemories || [],
      wisdom: compressedWisdom || [],
      workflow: workflow_name,
      tier: service_tier
    });

    // 5. Log retrieval
    await supabase.from('mrc_memory_retrieval_log').insert({
      session_id: sessionId,
      workflow_name,
      service_tier,
      rules_loaded: criticalRules?.length || 0,
      memories_loaded: recentMemories?.length || 0,
      context_size: formattedMemory.length
    });

    res.json({
      success: true,
      session_id: sessionId,
      memory: formattedMemory,
      stats: {
        critical_rules: criticalRules?.length || 0,
        recent_memories: recentMemories?.length || 0,
        compressed_patterns: compressedWisdom?.length || 0,
        total_context_size: formattedMemory.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function formatMRCMemory({ critical, recent, wisdom, workflow, tier }) {
  return `MRC UNIVERSAL CLAUDE PROCESSOR - MEMORY LOADED
???????????????????????????????????????????????????

Workflow: ${workflow}
Service Tier: ${tier.toUpperCase()}
Context: ${critical.length + recent.length + wisdom.length} rules loaded

?? CRITICAL RULES (NEVER VIOLATE):
${critical.map(rule => `• [${rule.service_tier.toUpperCase()}] ${rule.rule_text}`).join('\n')}

?? RECENT PATTERNS (LAST 30 DAYS):
${recent.map(mem => `• ${mem.memory_type?.toUpperCase() || 'GENERAL'}: ${mem.content}`).join('\n')}

?? COMPRESSED WISDOM (PROVEN PATTERNS):
${wisdom.map(w => `• ${w.pattern_description} (success rate: ${w.success_rate || 'N/A'}%)`).join('\n')}

PROCESSING MODE: Apply critical rules FIRST, then use relevant patterns for context.
Remember: This is a ${tier} tier client - respect their service boundaries.`;
}
