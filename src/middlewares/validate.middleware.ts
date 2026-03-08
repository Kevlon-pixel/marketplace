import { Request, Response, NextFunction } from "express";
import { ZodError, ZodObject } from "zod";

export const validateMiddleware =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "validation error",
          errors: err.issues,
        });
      }

      return res
        .status(500)
        .json({ success: false, message: "internal server error" });
    }
  };
