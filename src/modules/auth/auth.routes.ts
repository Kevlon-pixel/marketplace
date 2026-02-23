import { Router } from "express";
import { login, logout, refresh, register, verify } from "./auth.controller";
import authTokenMiddleware from "./auth-token.middleware";
import { validateMiddleware } from "../../middlewares/validate.middleware";
import { RegisterSchema } from "./schemas/register.schema";
import { VerifySchema } from "./schemas/verify.schema";
import { LoginSchema } from "./schemas/login.schema";

const router = Router();

router.post("/register", validateMiddleware(RegisterSchema), register);
router.post("/verify", validateMiddleware(VerifySchema), verify);
router.post("/login", validateMiddleware(LoginSchema), login);
router.post("/logout", authTokenMiddleware, logout);
router.post("/refresh", refresh);

export default router;
