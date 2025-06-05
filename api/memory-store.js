const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Memory endpoint ready",
    method: req.method,
    env_check: {
      supabase_url: process.env.SUPABASE_URL ? "Set" : "Not set",
      supabase_key: process.env.SUPABASE_SERVICE_KEY ? "Set" : "Not set",
      anthropic_key: process.env.ANTHROPIC_API_KEY ? "Set" : "Not set"
    }
  });
};
