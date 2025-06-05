export default async function handler(req, res) {
  try {
    // Just try to import createClient
    const { createClient } = await import('@supabase/supabase-js');
    
    res.status(200).json({
      message: "Import successful",
      has_createClient: typeof createClient === 'function'
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
