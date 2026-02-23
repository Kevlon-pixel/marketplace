import pino from "pino";
import isDev from "../config/isDev";

const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "hostname",
        },
      }
    : undefined,
});

export default logger;
