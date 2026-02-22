const isDev = require("../config/isDev");
const authService = require("../services/authService");
const {
  ipLimiter,
  loginLimiter,
  verifyEmailLimiter,
} = require("../utils/rateLimiter");

const register = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await authService.register(email, password);

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    err.origin = "authController.register";
    next(err);
  }
};

const verify = async (req, res, next) => {
  const { email, code } = req.body;
  const ip = req.ip;

  try {
    try {
      await ipLimiter.consume(ip);
    } catch (ipReject) {
      return res
        .status(429)
        .json({ message: "Слишком много запросов с вашего устройства." });
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
    if (err.statusCode === 400) {
      try {
        await verifyEmailLimiter.consume(email);
      } catch (rlRejected) {}
    }

    err.origin = "authController.verify";
    next(err);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const ip = req.ip;

  try {
    try {
      await ipLimiter.consume(ip);
    } catch (ipReject) {
      return res
        .status(429)
        .json({ message: "Слишком много запросов с вашего устройства." });
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
    if (err.statusCode === 401 || err.statusCode === 403) {
      try {
        await loginLimiter.consume(email);
      } catch (rlRejected) {}
    }

    err.origin = "authController.login";
    next(err);
  }
};

const logout = (req, res, next) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: !isDev,
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ success: true, message: "logout successful" });
};

const refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

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
    });

    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    err.origin = "authController.refresh";
    next(err);
  }
};

module.exports = { register, verify, login, logout, refresh };
