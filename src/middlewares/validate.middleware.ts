import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

function replaceObjectValues(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
}

export const validateMiddleware =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "validation error",
          errors: result.error.issues,
        });
      }

      if ("body" in result.data) {
        req.body = result.data.body;
      }

      if ("query" in result.data && result.data.query) {
        replaceObjectValues(
          req.query as Record<string, unknown>,
          result.data.query as Record<string, unknown>,
        );
      }

      if ("params" in result.data && result.data.params) {
        replaceObjectValues(
          req.params as Record<string, unknown>,
          result.data.params as Record<string, unknown>,
        );
      }

      next();
    } catch {
      return res
        .status(500)
        .json({ success: false, message: "internal server error" });
    }
  };
