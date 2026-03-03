import z from "zod";
import { PaymentStatus } from "../../../generated/prisma/index.js";

export const GetSellerOrdersSchema = z.object({
  query: z.object({
    status: z.nativeEnum(PaymentStatus).optional(),
  }),
});

export const GetSellerOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid order id"),
  }),
});
