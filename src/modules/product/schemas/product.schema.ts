import z from "zod";

export const GetProductSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid product id"),
  }),
});
