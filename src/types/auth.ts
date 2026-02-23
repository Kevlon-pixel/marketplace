import type { JwtPayload } from "jsonwebtoken";

export interface TokenPayload extends JwtPayload {
  sub: string;
  type: "access" | "refresh";
}
