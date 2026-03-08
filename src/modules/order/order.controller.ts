import { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/types/error.js";
import { TypedRequest } from "../../shared/types/zod-request-express.js";
import orderService from "./order.service.js";
import {
  CreateOrderSchema,
  GetOrderSchema,
  PayOrderSchema,
  YooKassaWebhookSchema,
} from "./schemas/index.js";

export const createOrder = async (
  req: TypedRequest<typeof CreateOrderSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;
  const productId = req.body.productId;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await orderService.createOrder(userId, productId);

    return res.status(201).json({
      success: true,
      message: "order created, waiting for payment",
      data,
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.createOrder";
    next(appError);
  }
};

export const payOrder = async (
  req: TypedRequest<typeof PayOrderSchema>,
  res: Response,
  next: NextFunction,
) => {
  const orderId = req.params.id;
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await orderService.payOrder(userId, orderId);

    return res.status(200).json({
      success: true,
      message: "order payment is pending now",
      data,
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.payOrder";
    next(appError);
  }
};

export const getOrderSuccess = async (
  req: TypedRequest<typeof GetOrderSchema>,
  res: Response,
  next: NextFunction,
) => {
  const orderId = req.params.id;
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await orderService.getOrderStatus(orderId, userId);

    let message = "waiting for payment confirmation";

    if (data.status === "PAID") {
      message = "payment successful, item available";
    } else if (data.status === "FAILED") {
      message = "payment failed";
    } else if (data.status === "REFUNDED") {
      message = "payment refunded";
    }

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.getOrderSuccess";
    next(appError);
  }
};

export const getOrder = async (
  req: TypedRequest<typeof GetOrderSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;
  const orderId = req.params.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await orderService.getOrder(userId, orderId);

    return res.status(200).json({
      success: true,
      message:
        data.status === "PENDING"
          ? "waiting for payment confirmation"
          : undefined,
      data,
    });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.getOrder";
    next(appError);
  }
};

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await orderService.getMyOrders(userId);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.getMyOrders";
    next(appError);
  }
};

export const yooKassaWebhook = async (
  req: TypedRequest<typeof YooKassaWebhookSchema>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const event = req.body.event;
    const paymentId = req.body.object.id;
    const paymentStatus = req.body.object.status;

    const data = await orderService.yooKassaWebhook(
      event,
      paymentId,
      paymentStatus,
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "orderController.yooKassaWebhook";
    next(appError);
  }
};
