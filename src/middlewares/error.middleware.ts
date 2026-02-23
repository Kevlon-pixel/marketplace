import type { ErrorRequestHandler } from "express";
import isDev from "../shared/config/is-dev";
import type { AppError } from "../shared/types/error";
import logger from "../shared/utils/logger";

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = err as AppError;

  const statusCode = appError.statusCode || 500;
  const { method, originalUrl } = req;
  const message = appError.message;

  const response: {
    success: boolean;
    message: string;
    stack?: string;
  } = {
    success: false,
    message: message || "Internal server error",
  };

  if (isDev) {
    response.stack = appError.stack;
  }

  logger.error(
    `[${appError.origin || "unknown"}] ${method} ${originalUrl} - ${message}`,
  );

  res.status(statusCode).json(response);
};

export default errorHandler;
