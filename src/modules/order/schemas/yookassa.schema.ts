import z from "zod";

export const YooKassaWebhookSchema = z.object({
  body: z.object({
    event: z.enum([
      "payment.succeeded",
      "payment.canceled",
      "refund.succeeded",
    ]),
    object: z.object({
      id: z.string().trim().min(1, "payment id is required"),
      status: z.enum(["succeeded", "canceled", "refunded"]),
    }),
  }),
});
