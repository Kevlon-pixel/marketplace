import type { RequestHandler } from "express";
import { z } from "zod";

const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(1, "password required")
      .min(8, "password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/,
        "password must contain at least one number, uppercase and lowercase letter",
      ),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(1, "password required")
      .min(8, "password must be at least 8 characters"),
  }),
});

const verifySchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    code: z.coerce
      .number()
      .int("code must be integer")
      .min(100000, "code must be 6 digits")
      .max(999999, "code must be 6 digits"),
  }),
});

export const authValidRegMiddleware: RequestHandler = (req, res, next) => {
  try {
    const parsed = registerSchema.parse({ body: req.body });
    req.body = parsed.body;
    next();
  } catch {
    return res
      .status(400)
      .json({ success: false, message: "incorrect email or password" });
  }
};

export const authValidLoginMiddleware: RequestHandler = (req, res, next) => {
  try {
    const parsed = loginSchema.parse({ body: req.body });
    req.body = parsed.body;
    next();
  } catch {
    return res
      .status(400)
      .json({ success: false, message: "incorrect email or password" });
  }
};

export const authValidVerifyMiddleware: RequestHandler = (req, res, next) => {
  try {
    const parsed = verifySchema.parse({ body: req.body });
    req.body = parsed.body;
    next();
  } catch {
    return res.status(400).json({
      success: false,
      message: "incorrect email or verification code",
    });
  }
};
