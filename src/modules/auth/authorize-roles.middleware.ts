import type { RequestHandler } from "express";
import type { UserRole } from "../../shared/types/auth.js";

const authorizeRoles = (...roles: UserRole[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "forbidden",
      });
    }

    next();
  };
};

export default authorizeRoles;
