import z from "zod";

export const RegisterSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "email required")
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(1, "password required")
      .min(8, "password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/,
        "password must contain at least one number, uppercase and lowercase letter",
      ),
  }),
});
