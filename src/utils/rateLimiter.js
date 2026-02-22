const { RateLimiterMemory } = require("rate-limiter-flexible");

const ipLimiter = new RateLimiterMemory({
  points: 50,
  duration: 60 * 60,
  blockDuration: 300 * 60,
});

const loginLimiter = new RateLimiterMemory({
  points: 10,
  duration: 15 * 60,
  blockDuration: 60 * 60,
});

const verifyEmailLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
  blockDuration: 30 * 60,
});

module.exports = { ipLimiter, loginLimiter, verifyEmailLimiter };
