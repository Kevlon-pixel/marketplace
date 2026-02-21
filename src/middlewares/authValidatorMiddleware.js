const z = require("zod");

const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "email required" })
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    password: z
      .string({ required_error: "password required" })
      .min(8, "password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/,
        "password must contain at least one number, uppercase and lowercase letter",
      ),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "email required" })
      .email("incorrect email format")
      .trim()
      .toLowerCase(),
    password: z
      .string({ required_error: "password required" })
      .min(8, "password must be at least 8 characters"),
  }),
});

const authValidRegMiddleware = (req, res, next) => {
  try {
    const parsed = registerSchema.parse({
      body: req.body,
    });

    req.body = parsed.body;

    next();
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "incorrect email or password" });
  }
};

const authValidLoginMiddleware = (req, res, next) => {
  try {
    const parsed = loginSchema.parse({
      body: req.body,
    });

    req.body = parsed.body;

    next();
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "incorrect email or password" });
  }
};

module.exports = { authValidRegMiddleware, authValidLoginMiddleware };
