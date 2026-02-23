import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
  verify,
} from "../controllers/authController";
import authTokenMiddleware from "../middlewares/authTokenMiddleware";
import {
  authValidLoginMiddleware,
  authValidRegMiddleware,
  authValidVerifyMiddleware,
} from "../middlewares/authValidatorMiddleware";

const router = Router();

router.post("/register", authValidRegMiddleware, register);
router.post("/verify", authValidVerifyMiddleware, verify);
router.post("/login", authValidLoginMiddleware, login);
router.post("/logout", authTokenMiddleware, logout);
router.post("/refresh", refresh);

export default router;
