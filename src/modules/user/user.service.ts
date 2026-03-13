import prisma from "../../../prisma/prisma-client.js";
import { createError } from "../../shared/utils/create-error.js";

type OAuthUser = {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
};

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
    pendingPasswordHash: string,
    emailVerificationCode: number,
    emailVerificationCodeExpire: Date,
  ) {
    return await prisma.user.create({
      data: {
        email,
        pendingPasswordHash,
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
        pendingPasswordHash: true,
        isEmailVerified: true,
        emailVerificationCodeExpire: true,
        createdAt: true,
      },
    });
  }

  async findUserByYandexId(yandexId: string): Promise<OAuthUser | null> {
    return await prisma.user.findUnique({
      where: { yandexId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
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
    pendingPasswordHash: string,
    emailVerificationCode: number,
    emailVerificationCodeExpire: Date,
  ) {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        pendingPasswordHash,
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

  async findOrCreateOAuthUser(
    email: string,
    yandexId: string,
  ): Promise<OAuthUser> {
    const existingByYandexId = await this.findUserByYandexId(yandexId);

    if (existingByYandexId) {
      return existingByYandexId;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        yandexId: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (existingByEmail?.yandexId && existingByEmail.yandexId !== yandexId) {
      throw createError("email is already linked to another yandex account", 409);
    }

    if (existingByEmail) {
      return await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          yandexId,
          isEmailVerified: true,
        },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });
    }

    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        yandexId,
        passwordHash: null,
        pendingPasswordHash: null,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  }
}

export default new UserService();
