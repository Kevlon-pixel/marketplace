import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import prisma from "../../../prisma/prisma-client.js";
import { createError } from "../../shared/utils/create-error.js";
import { UserRole } from "../../shared/types/auth.js";
import { getOrThrowEnv } from "../../shared/utils/get-or-throw-env.js";
import { sendVerificationEmail } from "../../shared/utils/smtp.js";
import userService from "../user/user.service.js";

class AuthService {
  async register(email: string, password: string) {
    const now = new Date();

    const user = await userService.findUserByEmail(email);

    if (user?.passwordHash) {
      if (user.isEmailVerified) {
        throw createError("user with this email already verified", 409);
      }

      if (
        user.emailVerificationCodeExpire !== null &&
        user.emailVerificationCodeExpire > now
      ) {
        throw createError(
          "verification email already sent, please check your inbox",
          400,
        );
      }

      const emailCode = crypto.randomInt(100000, 1000000);
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { email: user.email },
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

    const salt = Number(getOrThrowEnv("SALT"));
    const passwordHash = await bcrypt.hash(password, salt);

    const emailCode = crypto.randomInt(100000, 1000000);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = user
      ? await userService.upgradeGuestToRegistered(
          user.id,
          passwordHash,
          emailCode,
          expires,
        )
      : await userService.createRegisteredUser(
          email,
          passwordHash,
          emailCode,
          expires,
        );

    await this.sendVerificationEmailOrRollback(
      newUser.id,
      newUser.email,
      emailCode,
      expires,
    );

    return newUser;
  }

  async verifyEmail(email: string, code: number) {
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerificationCode: true,
        emailVerificationCodeExpire: true,
      },
    });

    if (!user) {
      throw createError("user not found", 404);
    }

    if (user.isEmailVerified) {
      throw createError("email already verified", 409);
    }

    if (
      user.emailVerificationCode === null ||
      user.emailVerificationCodeExpire === null
    ) {
      throw createError("verification code not requested", 400);
    }

    if (user.emailVerificationCodeExpire < now) {
      throw createError("verification code expired", 400);
    }

    if (user.emailVerificationCode !== code) {
      throw createError("invalid verification code", 400);
    }

    return prisma.user.update({
      where: { id: user.id },
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
  }

  async login(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!existingUser) {
      throw createError("invalid credentials", 401);
    }

    if (!existingUser.passwordHash) {
      throw createError("user is not registered", 401);
    }

    const passwordCompare = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!passwordCompare) {
      throw createError("invalid credentials", 401);
    }

    if (!existingUser.isEmailVerified) {
      throw createError("email is not verified", 403);
    }

    return this.generateTokens(existingUser.id);
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

    if (payload.role !== "user") {
      throw createError("invalid token role", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw createError("user not found", 401);
    }

    return this.generateTokens(payload.sub);
  }

  async guest(email: string) {
    const user = await userService.findOrCreateGuestByEmail(email);
    const accessToken = this.generateAccessToken(user.id, "guest", "guest");

    return { accessToken, user };
  }

  private async generateTokens(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(userId, "access", "user");
    const refreshExpires = getOrThrowEnv(
      "JWT_REFRESH_EXPIRES",
    ) as SignOptions["expiresIn"];

    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: "refresh",
        role: "user",
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
  ) {
    const accessExpires = getOrThrowEnv(
      "JWT_ACCESS_EXPIRES",
    ) as SignOptions["expiresIn"];

    return jwt.sign(
      {
        sub: userId,
        type,
        role,
      },
      getOrThrowEnv("JWT_ACCESS_SECRET"),
      { expiresIn: accessExpires },
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
}

export default new AuthService();
