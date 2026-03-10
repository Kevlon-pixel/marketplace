import type { RequestHandler } from "express";
import isDev from "../../shared/config/is-dev.js";
import authService from "./auth.service.js";

import type { AppError } from "../../shared/types/error.js";
import { TypedRequest } from "../../shared/types/zod-request-express.js";
import {
  GuestSchema,
  LoginSchema,
  RegisterSchema,
  VerifySchema,
} from "./schemas/index.js";
import {
  guestEmailLimiter,
  ipLimiter,
  loginLimiter,
  verifyEmailLimiter,
} from "../../shared/utils/rate-limiter.js";

export const register: RequestHandler = async (
  req: TypedRequest<typeof RegisterSchema>,
  res,
  next,
) => {
  const { email, password } = req.body;

  try {
    const user = await authService.register(email, password);
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "authController.register";
    next(appError);
  }
};

export const verify: RequestHandler = async (
  req: TypedRequest<typeof VerifySchema>,
  res,
  next,
) => {
  const { email, code } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
    } catch {
      return res.status(429).json({
        message: "Слишком много запросов с вашего устройства.",
      });
    }

    const emailLimit = await verifyEmailLimiter.get(email);
    if (emailLimit && emailLimit.remainingPoints <= 0) {
      return res.status(429).json({
        success: false,
        message: "too many unsuccessful attempts from this email",
      });
    }

    const user = await authService.verifyEmail(email, code);
    await verifyEmailLimiter.delete(email);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    const appError = err as AppError;

    if (appError.statusCode === 400) {
      try {
        await verifyEmailLimiter.consume(email);
      } catch {}
    }

    appError.origin = "authController.verify";
    next(appError);
  }
};

export const login: RequestHandler = async (
  req: TypedRequest<typeof LoginSchema>,
  res,
  next,
) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
    } catch {
      return res.status(429).json({
        message: "Слишком много запросов с вашего устройства.",
      });
    }

    const limiter = await loginLimiter.get(email);
    if (limiter && limiter.remainingPoints <= 0) {
      return res
        .status(429)
        .json({ success: false, message: "too many unsuccessful attempts" });
    }

    const { accessToken, refreshToken } = await authService.login(
      email,
      password,
    );

    await loginLimiter.delete(email);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({ success: true, accessToken });
  } catch (err) {
    const appError = err as AppError;

    if (appError.statusCode === 401 || appError.statusCode === 403) {
      try {
        await loginLimiter.consume(email);
      } catch {}
    }

    appError.origin = "authController.login";
    next(appError);
  }
};

export const logout: RequestHandler = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: !isDev,
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ success: true, message: "logout successful" });
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken as string | undefined;

    if (!oldRefreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "token required" });
    }

    const { accessToken, refreshToken } =
      await authService.refresh(oldRefreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "authController.refresh";
    next(appError);
  }
};

export const guest: RequestHandler = async (
  req: TypedRequest<typeof GuestSchema>,
  res,
  next,
) => {
  const { email } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
      await guestEmailLimiter.consume(email);
    } catch {
      return res.status(429).json({
        success: false,
        message: "too many guest auth attempts",
      });
    }

    const { accessToken, user } = await authService.guest(email);
    await guestEmailLimiter.delete(email);

    return res.status(200).json({
      success: true,
      accessToken,
      data: user,
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "authController.guest";
    next(appError);
  }
};
