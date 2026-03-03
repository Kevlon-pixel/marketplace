import z from "zod";
import { InventoryItemStatus } from "../../../generated/prisma/index.js";

export const ImportInventoryKeysSchema = z.object({
  body: z.object({
    productId: z.string().uuid("invalid product id"),
    keys: z
      .array(z.string().trim().min(1, "key cannot be empty"))
      .min(1, "at least one key is required"),
  }),
});

const AccountSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, "login required")
    .max(200, "login is too long"),
  password: z
    .string()
    .trim()
    .min(1, "password required")
    .max(200, "password is too long"),
  email: z.string().trim().email("invalid email").optional(),
  additionalData: z.record(z.string(), z.string().trim().min(1)).optional(),
});

export const ImportInventoryAccountsSchema = z.object({
  body: z.object({
    productId: z.string().uuid("invalid product id"),
    accounts: z.array(AccountSchema).min(1, "at least one account is required"),
  }),
});

export const GetInventorySchema = z.object({
  query: z.object({
    productId: z.string().uuid("invalid product id").optional(),
    status: z.nativeEnum(InventoryItemStatus).optional(),
  }),
});
