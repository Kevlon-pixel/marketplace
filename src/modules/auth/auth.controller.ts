import type { RequestHandler } from "express";
import isDev from "../../shared/config/is-dev.js";
import authService from "./auth.service.js";

import type { AppError } from "../../shared/types/error.js";
import { TypedRequest } from "../../shared/types/zod-request-express.js";
import {
  ForgotPasswordSchema,
  GuestSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyResetCodeSchema,
  VerifySchema,
} from "./schemas/index.js";
import {
  forgotPasswordLimiter,
  guestEmailLimiter,
  ipLimiter,
  loginLimiter,
  refreshLimiter,
  registerEmailLimiter,
  verifyResetCodeLimiter,
  verifyEmailLimiter,
} from "../../shared/utils/rate-limiter.js";

export const register: RequestHandler = async (
  req: TypedRequest<typeof RegisterSchema>,
  res,
  next,
) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
      await registerEmailLimiter.consume(email);
    } catch {
      return res.status(429).json({
        success: false,
        message: "too many registration attempts",
      });
    }

    await authService.register(email, password);

    return res.status(201).json({
      success: true,
      message: "if the email can be used, check your inbox for next steps",
    });
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
        success: false,
        message: "too many registration attempts",
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
        success: false,
        message: "too many registration attempts",
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

    if (appError.statusCode === 401) {
      try {
        await loginLimiter.consume(email);
      } catch {}
    }

    appError.origin = "authController.login";
    next(appError);
  }
};

export const forgotPassword: RequestHandler = async (
  req: TypedRequest<typeof ForgotPasswordSchema>,
  res,
  next,
) => {
  const { email } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
      await forgotPasswordLimiter.consume(email);
    } catch {
      return res.status(429).json({
        success: false,
        message: "too many password reset requests",
      });
    }

    await authService.requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: "if the account exists, check your inbox for a reset code",
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "authController.forgotPassword";
    next(appError);
  }
};

export const verifyResetCode: RequestHandler = async (
  req: TypedRequest<typeof VerifyResetCodeSchema>,
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
        success: false,
        message: "too many password code verify requests",
      });
    }

    const limiter = await verifyResetCodeLimiter.get(email);
    if (limiter && limiter.remainingPoints <= 0) {
      return res.status(429).json({
        success: false,
        message: "too many unsuccessful reset code attempts",
      });
    }

    const data = await authService.verifyResetCode(email, code);
    await verifyResetCodeLimiter.delete(email);

    return res.status(200).json({
      success: true,
      message: "reset code verified",
      data,
    });
  } catch (err) {
    const appError = err as AppError;

    if (appError.statusCode === 400) {
      try {
        await verifyResetCodeLimiter.consume(email);
      } catch {}
    }

    appError.origin = "authController.verifyResetCode";
    next(appError);
  }
};

export const resetPassword: RequestHandler = async (
  req: TypedRequest<typeof ResetPasswordSchema>,
  res,
  next,
) => {
  const { resetToken, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    try {
      await ipLimiter.consume(ip);
    } catch {
      return res.status(429).json({
        success: false,
        message: "too many password reset requests",
      });
    }

    await authService.resetPassword(resetToken, password);

    return res.status(200).json({
      success: true,
      message: "password changed successfully",
    });
  } catch (err) {
    const appError = err as AppError;

    appError.origin = "authController.resetPassword";
    next(appError);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    const tokenVersion = req.user?.tokenVersion;

    if (!userId || typeof tokenVersion !== "number") {
      return res.status(401).json({
        success: false,
        message: "unauthorized",
      });
    }

    await authService.logout(userId, tokenVersion);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: !isDev,
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({ success: true, message: "logout successful" });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "authController.logout";
    next(appError);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

  try {
    const oldRefreshToken = req.cookies?.refreshToken as string | undefined;

    try {
      await ipLimiter.consume(ip);
    } catch {
      return res.status(429).json({
        success: false,
        message: "too many refresh attempts",
      });
    }

    const limiter = await refreshLimiter.get(ip);
    if (limiter && limiter.remainingPoints <= 0) {
      return res.status(429).json({
        success: false,
        message: "too many refresh attempts",
      });
    }

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

    await refreshLimiter.delete(ip);
    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    const appError = err as AppError;

    if (appError.statusCode === 400 || appError.statusCode === 401) {
      try {
        await refreshLimiter.consume(ip);
      } catch {}
    }

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
