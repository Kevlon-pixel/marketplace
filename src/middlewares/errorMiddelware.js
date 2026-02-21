const isDev = require("../config/isDev");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const { method, originalUrl } = req;

  const message = err.message;

  const response = {
    success: false,
    message: message || "Internal server error",
  };

  if (isDev) {
    response.stack = err.stack;
  }

  logger.error(
    `[${err.origin || "unknown"}] ${method} ${originalUrl} - ${message}`,
  );

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
