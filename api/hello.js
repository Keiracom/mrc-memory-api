module.exports = (req, res) => {
  res.status(200).json({ 
    message: "MRC Memory API v2",
    timestamp: new Date().toISOString(),
    status: "operational"
  });
};
