module.exports = (req, res) => {
  res.status(200).json({
    hello: "world",
    message: "MRC Memory API is working!",
    time: new Date().toISOString()
  });
};
