import z from "zod";

export const CreateOrderSchema = z.object({
  body: z.object({
    productId: z.string().uuid("invalid product id"),
  }),
});

export const GetOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid order id"),
  }),
});

export const PayOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid order id"),
  }),
});
