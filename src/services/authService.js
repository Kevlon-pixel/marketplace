const prisma = require("../../prisma/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class AuthService {
  async register(email, password) {
    const normalizedEmail = email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (exists) {
      const error = new Error("email already exists");
      error.statusCode = 409;
      throw error;
    }

    const SALT = process.env.SALT;
    const passwordHash = await bcrypt.hash(password, Number(SALT));

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(email, password) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
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
}

module.exports = new AuthService();
