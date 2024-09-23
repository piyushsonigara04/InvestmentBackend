const jwt = require("jsonwebtoken");

const JWT_SECRET = 'piyush'; 

exports.verifytoken = (req, res, next) => {
  const token = req.cookies.token; 

  if (!token) {
    return res.status(401).json({
      status: "Error",
      message: "No token provided"
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: "Error",
        message: "Failed to authenticate token"
      });
    }
    req.userId = decoded.userId; 
    next();
  });
};
