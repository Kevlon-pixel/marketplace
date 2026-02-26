import type { TokenPayload } from "./auth.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}
