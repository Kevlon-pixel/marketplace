import { Request } from "express";
import { z, ZodObject } from "zod";

export interface TypedRequest<T extends ZodObject> extends Request<
  any,
  any,
  any,
  any
> {
  body: z.infer<T>["body"];
  query: z.infer<T>["query"];
  params: z.infer<T>["params"];
}
