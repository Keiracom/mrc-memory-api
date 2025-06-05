const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { context = {}, workflow_name = "test" } = req.method === "POST" ? req.body : req.query;
    const sessionId = `mrc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Load critical rules
    const { data: criticalRules, error } = await supabase
      .from("mrc_critical_rules")
      .select("rule_text, service_tier, severity")
      .eq("is_active", true)
      .order("severity", { ascending: false })
      .limit(50);

    if (error) throw error;

    res.status(200).json({
      success: true,
      session_id: sessionId,
      memory: `MRC MEMORY SYSTEM ACTIVE
Critical Rules: ${criticalRules?.length || 0}
Workflow: ${workflow_name}

RULES:
${criticalRules?.map(r => `- [${r.service_tier}] ${r.rule_text}`).join("\n") || "No rules found"}`,
      stats: {
        critical_rules: criticalRules?.length || 0,
        active_memories: 0,
        compressed_wisdom: 0
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      detail: "Check if environment variables are set in Vercel"
    });
  }
};
