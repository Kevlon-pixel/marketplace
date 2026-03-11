import type { JwtPayload } from "jsonwebtoken";

export type UserRole = "user" | "guest";

export interface TokenPayload extends JwtPayload {
  sub: string;
  type: "access" | "refresh" | "guest";
  role: UserRole;
  tokenVersion: number;
}
