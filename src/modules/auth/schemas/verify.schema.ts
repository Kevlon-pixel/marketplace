import z from "zod";

export const VerifySchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    code: z.coerce
      .number()
      .int("code must be integer")
      .min(100000, "code must be 6 digits")
      .max(999999, "code must be 6 digits"),
  }),
});
