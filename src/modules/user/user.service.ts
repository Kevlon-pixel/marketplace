import prisma from "../../../prisma/prisma-client.js";
import { createError } from "../../shared/utils/create-error.js";

class UserService {
  async createGuestUser(email: string) {
    return await prisma.user.create({
      data: {
        email,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async createRegisteredUser(
    email: string,
    passwordHash: string,
    emailVerificationCode: number,
    emailVerificationCodeExpire: Date,
  ) {
    return await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerificationCode,
        emailVerificationCodeExpire,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async findUserById(userId: string) {
    return await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async findUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isEmailVerified: true,
        emailVerificationCodeExpire: true,
        createdAt: true,
      },
    });
  }

  async findOrCreateGuestByEmail(email: string) {
    const existingUser = await this.findUserByEmail(email);

    if (existingUser?.passwordHash) {
      throw createError("user already registered, use login", 409);
    }

    if (existingUser) {
      return existingUser;
    }

    return await this.createGuestUser(email);
  }

  async upgradeGuestToRegistered(
    userId: string,
    passwordHash: string,
    emailVerificationCode: number,
    emailVerificationCodeExpire: Date,
  ) {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
        isEmailVerified: false,
        emailVerificationCode,
        emailVerificationCodeExpire,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }
}

export default new UserService();
