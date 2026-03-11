import z from "zod";

export const ResetPasswordSchema = z.object({
  body: z.object({
    resetToken: z.string().min(1, "reset token required").trim(),
    password: z
      .string()
      .min(1, "password required")
      .min(8, "password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
        "password must contain at least one number, uppercase and lowercase letter",
      ),
  }),
});
