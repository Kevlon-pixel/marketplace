import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import prisma from "../prisma/prismaClient";
import errorHandler from "./middlewares/errorMiddleware";
import authRoutes from "./routes/authRoutes";
import logger from "./utils/logger";
import { getOrThrowEnv } from "./utils/getOrThrowEnv";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();

    const port = Number(getOrThrowEnv("PORT")) || 3000;
    app.listen(port, () => {
      logger.info({ port }, "Server started");
    });
  } catch (err) {
    logger.error({ err }, "Error to start app");
    process.exit(1);
  }
}

bootstrap();

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
