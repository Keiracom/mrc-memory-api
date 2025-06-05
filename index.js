const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function generateSessionId() {
  return `mrc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// CORE ENDPOINT: RETRIEVE OPTIMAL MEMORY
app.post('/api/memory/retrieve', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      workflow_name, 
      service_tier = 'all', 
      context = {},
      max_lines = 750,
      session_id = null
    } = req.body;

    const sessionId = session_id || generateSessionId();

    // Load critical rules
    const { data: criticalRules } = await supabase
      .from('mrc_critical_rules')
      .select('rule_text, service_tier, severity')
      .eq('is_active', true)
      .or(`service_tier.eq.${service_tier},service_tier.eq.all`)
      .order('severity', { ascending: false })
      .limit(50);

    // Load recent memories  
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeMemories } = await supabase
      .from('mrc_memory_entries')
      .select('*')
      .eq('is_archived', false)
      .gte('created_at', thirtyDaysAgo)
      .gte('relevance_score', 70)
      .order('relevance_score', { ascending: false })
      .limit(200);

    // Format memory for Claude
    const formattedMemory = `
MRC UNIVERSAL MEMORY SYSTEM - CONTEXT LOADED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workflow: ${workflow_name || 'General Processing'}
Service Tier: ${service_tier.toUpperCase()}
Memory Loaded: ${(criticalRules?.length || 0) + (activeMemories?.length || 0)} rules/patterns

🚨 CRITICAL RULES (NEVER VIOLATE):
${(criticalRules || []).map(rule => `• [${rule.service_tier.toUpperCase()}] ${rule.rule_text}`).join('\n')}

📈 ACTIVE PATTERNS (LAST 30 DAYS):
${(activeMemories || []).map(mem => `• ${mem.memory_type.toUpperCase()}: ${mem.content}`).join('\n')}

PROCESSING INSTRUCTIONS:
1. Apply CRITICAL RULES first - these are non-negotiable
2. Use ACTIVE PATTERNS when relevant to current request  
3. Remember: This is a ${service_tier} tier client - respect service boundaries
4. Always learn from this interaction for future improvement

Ready to process request with full memory context.
`;

    const stats = {
      critical_rules: criticalRules?.length || 0,
      active_memories: activeMemories?.length || 0,
      total_context_size: formattedMemory.length,
      retrieval_time_ms: Date.now() - startTime
    };

    // Log retrieval
    await supabase.from('mrc_memory_retrieval_log').insert({
      session_id: sessionId,
      workflow_name: workflow_name || 'unknown',
      service_tier: service_tier,
      critical_rules_loaded: stats.critical_rules,
      active_memories_loaded: stats.active_memories,
      total_context_size: stats.total_context_size,
      retrieval_time_ms: stats.retrieval_time_ms
    });

    res.json({
      success: true,
      session_id: sessionId,
      memory: formattedMemory,
      stats: stats
    });

  } catch (error) {
    console.error('Memory retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_memory: `MRC EMERGENCY MEMORY: This is a ${req.body.service_tier || 'startup'} tier client. NEVER promise features outside tier.`
    });
  }
});

// LEARNING STORAGE ENDPOINT
app.post('/api/memory/store-learning', async (req, res) => {
  try {
    const {
      session_id,
      learning_type,
      content,
      context = {},
      relevance_score = 75,
      workflow_source = 'unknown'
    } = req.body;

    if (relevance_score >= 70) {
      await supabase.from('mrc_memory_entries').insert({
        session_id,
        memory_type: learning_type,
        content,
        context,
        relevance_score,
        workflow_source,
        client_tier: context.service_tier || null
      });

      res.json({ success: true, stored: true });
    } else {
      res.json({ success: true, stored: false, message: 'Below relevance threshold' });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'MRC Memory API',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MRC Memory API running on port ${PORT}`);
});

module.exports = app;