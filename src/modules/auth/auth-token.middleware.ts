import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { TokenPayload } from "../../shared/types/auth.js";
import { getOrThrowEnv } from "../../shared/utils/get-or-throw-env.js";

const authTokenMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "access denied. token missing" });
  }

  const token = authHeader.split(" ")[1];
  const secret = getOrThrowEnv("JWT_ACCESS_SECRET");

  if (!secret) {
    return res
      .status(500)
      .json({ success: false, message: "JWT_ACCESS_SECRET is not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !["access", "guest"].includes(decoded.type) ||
      !["user", "guest"].includes(decoded.role) ||
      typeof decoded.sub !== "string"
    ) {
      return res
        .status(401)
        .json({ success: false, message: "invalid token type" });
    }

    req.user = decoded as TokenPayload;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "invalid or expired token" });
  }
};

export default authTokenMiddleware;
