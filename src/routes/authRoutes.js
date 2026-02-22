const express = require("express");
const {
  register,
  verify,
  login,
  logout,
  refresh,
} = require("../controllers/authController");
const authTokenMiddleware = require("../middlewares/authTokenMiddleware");
const {
  authValidRegMiddleware,
  authValidLoginMiddleware,
  authValidVerifyMiddleware,
} = require("../middlewares/authValidatorMiddleware");

const router = express.Router();

router.post("/register", authValidRegMiddleware, register);
router.post("/verify", authValidVerifyMiddleware, verify);
router.post("/login", authValidLoginMiddleware, login);
router.post("/logout", authTokenMiddleware, logout);
router.post("/refresh", refresh);

module.exports = router;
