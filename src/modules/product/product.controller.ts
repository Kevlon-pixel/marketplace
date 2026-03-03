import { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/types/error.js";
import productService from "./product.service.js";
import { TypedRequest } from "../../shared/types/zod-request-express.js";
import { GetProductSchema } from "./schemas/product.schema.js";

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await productService.getAllProducts();

    res.status(200).json({ success: true, data: data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "productController.getAllProducts";
    next(appError);
  }
};

export const getProduct = async (
  req: TypedRequest<typeof GetProductSchema>,
  res: Response,
  next: NextFunction,
) => {
  const id = req.params.id;

  try {
    const data = await productService.getProduct(id);

    res.status(200).json({ success: true, data: data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "productController.getProduct";
    next(appError);
  }
};
