import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const {
      session_id,
      learning_type = "general",
      content,
      relevance_score = 75
    } = req.body;

    const { data, error } = await supabase
      .from("mrc_memory_entries")
      .insert({
        session_id,
        memory_type: learning_type,
        content,
        relevance_score,
        source: "api"
      })
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      stored: true,
      memory_id: data[0]?.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
