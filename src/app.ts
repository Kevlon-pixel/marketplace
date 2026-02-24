import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import prisma from "../prisma/prisma-client";
import errorHandler from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { getOrThrowEnv } from "./shared/utils/get-or-throw-env";
import logger from "./shared/utils/logger";
import swaggerUi from "swagger-ui-express";
import swaggerJsdocs from "swagger-jsdoc";

const swaggerDocs = swaggerJsdocs({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Marketplace",
      version: "0.1",
      description: "Marketplace API documentation",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: getOrThrowEnv("BACKEND_URL"),
      },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts", "./dist/src/modules/**/*.routes.js"],
});

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
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
