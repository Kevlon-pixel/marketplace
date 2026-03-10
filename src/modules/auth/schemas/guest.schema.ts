import z from "zod";

export const GuestSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
  }),
});
