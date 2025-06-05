﻿module.exports = (req, res) => {
  res.status(200).json({ 
    message: "MRC Memory API is working!",
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
};
