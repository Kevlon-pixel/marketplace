require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/authRoutes");
const app = express();
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorMiddelware");
const prisma = require("../prisma/prismaClient");
const cookieParser = require("cookie-parser");
const isDev = require("./config/isDev");

/*middleware для парсинга JSON в теле входящего запроса*/
app.use(express.json());
/*использование cookie для refresh токена*/
app.use(cookieParser());

/*подключение router(-ов), маршрут(-ов) с префиксом*/
app.use("/api/auth", authRoutes);

/*подключение обработчика ошибок*/
app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info({ port: PORT }, `Server started`);
    });
  } catch (err) {
    logger.error("Error to start app", err);
    process.exit(1);
  }
}

bootstrap();

/*отключение от бд при помощи системных сигналов*/
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
