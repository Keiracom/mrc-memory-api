// /api/memory-retrieve-efficient.js
// Optimized for ~750 lines max (60KB) - Perfect for Claude context

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      workflow_name, 
      service_tier = 'all',
      context = {},
      max_context_lines = 750  // Hard limit for Claude context
    } = req.body;

    const sessionId = `mrc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // PHASE 1: Critical Rules (ALWAYS load - max 50 lines)
    const { data: criticalRules } = await supabase
      .from('mrc_critical_rules')
      .select('rule_text, service_tier, severity')
      .eq('is_active', true)
      .or(`service_tier.eq.${service_tier},service_tier.eq.all`)
      .order('severity', { ascending: false })
      .limit(20); // Reduced from 50 to save space

    // PHASE 2: Context-Relevant Memories (max 400 lines)
    const { data: relevantMemories } = await supabase
      .from('mrc_memory_entries')
      .select('content, memory_type, relevance_score, created_at')
      .eq('is_archived', false)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Only last 14 days
      .gte('relevance_score', 80) // Higher threshold
      .ilike('content', `%${workflow_name || ''}%`) // Simple context filter for now
      .order('relevance_score', { ascending: false })
      .limit(15); // Reduced to prevent context bloat

    // PHASE 3: Compressed Wisdom (max 200 lines)
    const { data: compressedWisdom } = await supabase
      .from('mrc_compressed_wisdom')
      .select('pattern_description, success_rate, frequency')
      .or(`applies_to_tier.eq.${service_tier},applies_to_tier.eq.all`)
      .gte('success_rate', 70)
      .order('frequency', { ascending: false })
      .limit(8); // Reduced to essential patterns only

    // PHASE 4: Smart Formatting (target <750 lines)
    const formattedMemory = formatCompactMemory({
      critical: criticalRules || [],
      recent: relevantMemories || [],
      wisdom: compressedWisdom || [],
      workflow: workflow_name,
      tier: service_tier,
      max_lines: max_context_lines
    });

    // PHASE 5: Context Size Validation
    const lineCount = formattedMemory.split('\n').length;
    if (lineCount > max_context_lines) {
      console.warn(`Context too large: ${lineCount} lines, truncating...`);
    }

    // PHASE 6: Log efficient retrieval
    await supabase.from('mrc_memory_log').insert({
      session_id: sessionId,
      workflow_name,
      service_tier,
      rules_loaded: criticalRules?.length || 0,
      memories_loaded: relevantMemories?.length || 0,
      context_size: formattedMemory.length,
      optimization_used: 'efficient_context_aware'
    });

    res.json({
      success: true,
      session_id: sessionId,
      memory: formattedMemory,
      stats: {
        critical_rules: criticalRules?.length || 0,
        recent_memories: relevantMemories?.length || 0,
        compressed_patterns: compressedWisdom?.length || 0,
        total_lines: lineCount,
        context_size_kb: Math.round(formattedMemory.length / 1024),
        optimization: 'context_efficient'
      }
    });

  } catch (error) {
    console.error('Efficient memory retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      fallback_memory: getMinimalFallback(req.body.service_tier || 'all')
    });
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

function formatCompactMemory({ critical, recent, wisdom, workflow, tier, max_lines }) {
  const sections = [];
  
  // Header (5 lines max)
  sections.push(`MRC MEMORY - ${(workflow || 'GENERAL').toUpperCase()}`);
  sections.push(`Service Tier: ${tier.toUpperCase()}`);
  sections.push(`Context: ${critical.length + recent.length + wisdom.length} rules loaded`);
  sections.push('━'.repeat(50));
  
  // Critical Rules (condensed - max 100 lines)
  if (critical.length > 0) {
    sections.push('🚨 CRITICAL RULES:');
    critical.slice(0, 15).forEach(rule => {
      sections.push(`• [${rule.service_tier?.toUpperCase() || 'ALL'}] ${rule.rule_text}`);
    });
    sections.push('');
  }
  
  // Recent Learnings (condensed - max 200 lines)
  if (recent.length > 0) {
    sections.push('📈 RECENT PATTERNS:');
    recent.slice(0, 10).forEach(mem => {
      const content = mem.content?.substring(0, 120) || 'No content';
      sections.push(`• ${mem.memory_type?.toUpperCase() || 'GENERAL'}: ${content}...`);
    });
    sections.push('');
  }
  
  // Compressed Wisdom (condensed - max 150 lines)
  if (wisdom.length > 0) {
    sections.push('🧠 PROVEN PATTERNS:');
    wisdom.slice(0, 6).forEach(w => {
      sections.push(`• ${w.pattern_description} (${w.success_rate}% success, ${w.frequency}x used)`);
    });
    sections.push('');
  }
  
  // Processing instructions (5 lines max)
  sections.push('INSTRUCTIONS: Apply critical rules FIRST, then use patterns for context.');
  sections.push('━'.repeat(50));
  
  const result = sections.join('\n');
  
  // Final safety check
  const lines = result.split('\n');
  if (lines.length > max_lines) {
    return lines.slice(0, max_lines).join('\n') + '\n[CONTEXT TRUNCATED FOR EFFICIENCY]';
  }
  
  return result;
}

function getMinimalFallback(tier) {
  return `MRC MINIMAL FALLBACK - ${tier.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL RULES:
- Startup ($297): Email only, 1-3 competitors, NO dashboard
- Growth ($697): Dashboard + alerts, 5-10 competitors  
- Enterprise ($1,297): OAuth required, 25+ competitors
- NEVER promise features outside service tier
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROCESSING: Apply tier boundaries strictly.`;
}
