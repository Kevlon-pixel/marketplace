const isDev = require("../config/isDev");
const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "password is too short" });
    }

    const user = await authService.register(email, password);

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    err.origin = "authController.register";
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });
    }

    const { accessToken, refreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ success: true, accessToken });
  } catch (err) {
    err.origin = "authController.login";
    next(err);
  }
};

const logout = async (req, res, next) => {
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

module.exports = { register, login, logout, refresh };
