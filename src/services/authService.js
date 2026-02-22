const prisma = require("../../prisma/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const smtp = require("../utils/smtp");
const crypto = require("crypto");

class AuthService {
  async register(email, password) {
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerificationCodeExpire: true,
      },
    });

    if (user) {
      if (user.isEmailVerified) {
        const error = new Error("user with this email already verified");
        error.statusCode = 409;
        throw error;
      }

      if (
        user.emailVerificationCodeExpire !== null &&
        user.emailVerificationCodeExpire > now
      ) {
        const error = new Error(
          "verification email already sent, please check your inbox",
        );
        error.statusCode = 400;
        throw error;
      }

      const emailCode = crypto.randomInt(100000, 1000000);
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: {
          email: user.email,
        },
        data: {
          emailVerificationCode: emailCode,
          emailVerificationCodeExpire: expires,
        },
      });

      await this.sendVerificationEmailOrRollback(
        user.id,
        email,
        emailCode,
        expires,
      );

      return {
        id: user.id,
        email: user.email,
        isEmailVerified: false,
      };
    }

    const SALT = process.env.SALT;
    const passwordHash = await bcrypt.hash(password, Number(SALT));

    const emailCode = crypto.randomInt(100000, 1000000);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerificationCode: emailCode,
        emailVerificationCodeExpire: expires,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    await this.sendVerificationEmailOrRollback(
      newUser.id,
      newUser.email,
      emailCode,
      expires,
    );

    return newUser;
  }

  async verifyEmail(email, code) {
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerificationCode: true,
        emailVerificationCodeExpire: true,
      },
    });

    if (!user) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.isEmailVerified) {
      const error = new Error("email already verified");
      error.statusCode = 409;
      throw error;
    }

    if (
      user.emailVerificationCode === null ||
      user.emailVerificationCodeExpire === null
    ) {
      const error = new Error("verification code not requested");
      error.statusCode = 400;
      throw error;
    }

    if (user.emailVerificationCodeExpire < now) {
      const error = new Error("verification code expired");
      error.statusCode = 400;
      throw error;
    }

    if (user.emailVerificationCode !== code) {
      const error = new Error("invalid verification code");
      error.statusCode = 400;
      throw error;
    }

    const verifiedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationCodeExpire: null,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    return verifiedUser;
  }

  async login(email, password) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!existingUser) {
      const error = new Error("invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const passwordCompare = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!passwordCompare) {
      const error = new Error("invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    if (!existingUser.isEmailVerified) {
      const error = new Error("email is not verified");
      error.statusCode = 403;
      throw error;
    }

    return this.generateTokens(existingUser.id);
  }

  async refresh(oldToken) {
    let payload;
    try {
      payload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      const error = new Error("invalid refresh token");
      error.statusCode = 401;
      throw error;
    }

    if (payload.type !== "refresh") {
      const error = new Error("invalid token type");
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      const error = new Error("user not found");
      error.statusCode = 401;
      throw error;
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      payload.sub,
    );

    return { accessToken, refreshToken };
  }

  async generateTokens(userId) {
    const accessToken = jwt.sign(
      {
        sub: userId,
        type: "access",
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES },
    );

    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES },
    );

    return { accessToken, refreshToken };
  }

  async sendVerificationEmailOrRollback(userId, email, emailCode, expires) {
    try {
      await smtp(email, emailCode, expires);
    } catch (smtpError) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationCode: null,
          emailVerificationCodeExpire: null,
        },
      });

      const error = new Error(
        "failed to send verification email, please try again",
      );
      error.statusCode = 503;
      throw error;
    }
  }
}

module.exports = new AuthService();
