import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import prisma from "../../../prisma/prisma-client.js";
import { createError } from "../../shared/utils/create-error.js";
import { UserRole } from "../../shared/types/auth.js";
import { getOrThrowEnv } from "../../shared/utils/get-or-throw-env.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../shared/utils/smtp.js";
import userService from "../user/user.service.js";

class AuthService {
  async register(email: string, password: string) {
    const salt = Number(getOrThrowEnv("SALT"));

    const user = await userService.findUserByEmail(email);
    const pendingPasswordHash = await bcrypt.hash(password, salt);

    if (user && user.isEmailVerified && !user.passwordHash) {
      throw createError("password is not set, use password reset", 409);
    }

    if (user?.passwordHash) {
      if (user.isEmailVerified) {
        return {
          id: user.id,
          email: user.email,
          isEmailVerified: true,
        };
      }

      const emailCode = crypto.randomInt(100000, 1000000);
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { email: user.email },
        data: {
          pendingPasswordHash,
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

    const emailCode = crypto.randomInt(100000, 1000000);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = user
      ? await userService.upgradeGuestToRegistered(
          user.id,
          pendingPasswordHash,
          emailCode,
          expires,
        )
      : await userService.createRegisteredUser(
          email,
          pendingPasswordHash,
          emailCode,
          expires,
        );

    await this.sendVerificationEmailOrRollback(
      newUser.id,
      newUser.email,
      emailCode,
      expires,
    );

    return {
      ...newUser,
      isEmailVerified: false,
    };
  }

  async verifyEmail(email: string, code: number) {
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        pendingPasswordHash: true,
        isEmailVerified: true,
        emailVerificationCode: true,
        emailVerificationCodeExpire: true,
      },
    });

    if (
      !user ||
      user.isEmailVerified ||
      user.emailVerificationCode === null ||
      user.emailVerificationCodeExpire === null ||
      user.emailVerificationCodeExpire < now ||
      user.emailVerificationCode !== code ||
      (user.passwordHash === null && user.pendingPasswordHash === null)
    ) {
      throw createError("invalid or expired verification code", 400);
    }

    return prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: user.passwordHash ?? user.pendingPasswordHash,
        pendingPasswordHash: null,
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
  }

  async login(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isEmailVerified: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!existingUser) {
      throw createError("invalid credentials", 401);
    }

    if (!existingUser.passwordHash) {
      if (existingUser.isEmailVerified) {
        throw createError("password is not set, use password reset", 401);
      }

      throw createError("invalid credentials", 401);
    }

    const passwordCompare = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!passwordCompare) {
      throw createError("invalid credentials", 401);
    }

    if (!existingUser.isEmailVerified) {
      throw createError("invalid credentials", 401);
    }

    return this.generateTokens(existingUser.id, existingUser.tokenVersion);
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    if (!user || !user.isEmailVerified) {
      return {
        email,
        passwordResetRequested: false,
      };
    }

    const passwordResetCode = crypto.randomInt(100000, 1000000);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode,
        passwordResetCodeExpire: expires,
      },
    });

    await this.sendPasswordResetEmailOrRollback(
      user.id,
      user.email,
      passwordResetCode,
      expires,
    );

    return {
      email: user.email,
      passwordResetRequested: true,
    };
  }

  async verifyResetCode(email: string, code: number) {
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isEmailVerified: true,
        passwordResetCode: true,
        passwordResetCodeExpire: true,
        tokenVersion: true,
      },
    });

    if (
      !user ||
      !user.isEmailVerified ||
      user.passwordResetCode === null ||
      user.passwordResetCodeExpire === null ||
      user.passwordResetCodeExpire < now ||
      user.passwordResetCode !== code
    ) {
      throw createError("invalid or expired password reset code", 400);
    }

    return {
      resetToken: this.generatePasswordResetToken(user.id, user.tokenVersion),
    };
  }

  async resetPassword(resetToken: string, password: string) {
    let payload: JwtPayload | string;
    try {
      payload = jwt.verify(resetToken, getOrThrowEnv("JWT_ACCESS_SECRET"));
    } catch {
      throw createError("invalid or expired reset token", 401);
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.type !== "password-reset" ||
      typeof payload.sub !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      throw createError("invalid reset token payload", 400);
    }

    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isEmailVerified: true,
        passwordResetCode: true,
        passwordResetCodeExpire: true,
        tokenVersion: true,
      },
    });

    if (
      !user ||
      !user.isEmailVerified ||
      user.tokenVersion !== payload.tokenVersion ||
      user.passwordResetCode === null ||
      user.passwordResetCodeExpire === null ||
      user.passwordResetCodeExpire < now
    ) {
      throw createError("invalid or expired reset token", 401);
    }

    const salt = Number(getOrThrowEnv("SALT"));
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
        passwordResetCode: null,
        passwordResetCodeExpire: null,
      },
    });
  }

  async refresh(oldToken: string) {
    let payload: JwtPayload | string;
    try {
      payload = jwt.verify(oldToken, getOrThrowEnv("JWT_REFRESH_SECRET"));
    } catch {
      throw createError("invalid refresh token", 401);
    }

    if (typeof payload !== "object" || payload === null) {
      throw createError("invalid refresh token payload", 400);
    }

    if (payload.type !== "refresh" || typeof payload.sub !== "string") {
      throw createError("invalid token type", 400);
    }

    if (payload.role !== "user" || typeof payload.tokenVersion !== "number") {
      throw createError("invalid token role", 400);
    }

    const updatedUser = await prisma.user.updateMany({
      where: {
        id: payload.sub,
        tokenVersion: payload.tokenVersion,
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    if (updatedUser.count !== 1) {
      throw createError("invalid refresh token", 401);
    }

    return this.generateTokens(payload.sub, payload.tokenVersion + 1);
  }

  async logout(userId: string, tokenVersion: number) {
    const updatedUser = await prisma.user.updateMany({
      where: {
        id: userId,
        tokenVersion,
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    if (updatedUser.count !== 1) {
      throw createError("invalid or expired token", 401);
    }
  }

  async guest(email: string) {
    const user = await userService.findOrCreateGuestByEmail(email);
    const accessToken = this.generateAccessToken(user.id, "guest", "guest", 0);

    return { accessToken, user };
  }

  async loginWithOAuth(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError("oauth user not found", 404);
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.tokenVersion,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    };
  }

  private async generateTokens(
    userId: string,
    tokenVersion: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(
      userId,
      "access",
      "user",
      tokenVersion,
    );
    const refreshExpires = getOrThrowEnv(
      "JWT_REFRESH_EXPIRES",
    ) as SignOptions["expiresIn"];

    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: "refresh",
        role: "user",
        tokenVersion,
      },
      getOrThrowEnv("JWT_REFRESH_SECRET"),
      { expiresIn: refreshExpires },
    );

    return { accessToken, refreshToken };
  }

  private generateAccessToken(
    userId: string,
    type: "access" | "guest",
    role: UserRole,
    tokenVersion: number,
  ) {
    const accessExpires = getOrThrowEnv(
      "JWT_ACCESS_EXPIRES",
    ) as SignOptions["expiresIn"];

    return jwt.sign(
      {
        sub: userId,
        type,
        role,
        tokenVersion,
      },
      getOrThrowEnv("JWT_ACCESS_SECRET"),
      { expiresIn: accessExpires },
    );
  }

  private generatePasswordResetToken(userId: string, tokenVersion: number) {
    return jwt.sign(
      {
        sub: userId,
        type: "password-reset",
        tokenVersion,
      },
      getOrThrowEnv("JWT_ACCESS_SECRET"),
      { expiresIn: "10m" },
    );
  }

  private async sendVerificationEmailOrRollback(
    userId: string,
    email: string,
    emailCode: number,
    expires: Date,
  ): Promise<void> {
    try {
      await sendVerificationEmail(email, emailCode, expires);
    } catch {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pendingPasswordHash: null,
          isEmailVerified: false,
          emailVerificationCode: null,
          emailVerificationCodeExpire: null,
        },
      });

      throw createError(
        "failed to send verification email, please try again",
        503,
      );
    }
  }

  private async sendPasswordResetEmailOrRollback(
    userId: string,
    email: string,
    passwordResetCode: number,
    expires: Date,
  ): Promise<void> {
    try {
      await sendPasswordResetEmail(email, passwordResetCode, expires);
    } catch {
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetCode: null,
          passwordResetCodeExpire: null,
        },
      });

      throw createError(
        "failed to send password reset email, please try again",
        503,
      );
    }
  }
}

export default new AuthService();
