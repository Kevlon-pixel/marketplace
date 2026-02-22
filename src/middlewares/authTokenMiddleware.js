const jwt = require("jsonwebtoken");

const authTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "access denied. token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.type !== "access") {
      return res
        .status(401)
        .json({ success: false, message: "invalid token type" });
    }

    req.user = decoded;

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "invalid or expired token" });
  }
};

module.exports = authTokenMiddleware;
