import { NextFunction, Response } from "express";
import { AppError } from "../../shared/types/error.js";
import {
  DeleteListingSchema,
  GetInventorySchema,
  GetSellerOrderSchema,
  GetSellerOrdersSchema,
  ImportInventoryAccountsSchema,
  ImportInventoryKeysSchema,
  ListingSchema,
  UpdateListingSchema,
} from "./schemas/index.js";
import { TypedRequest } from "../../shared/types/zod-request-express.js";
import sellerService from "./seller.service.js";

export const listings = async (
  req: TypedRequest<typeof ListingSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: true, message: "unauthorized" });
    }

    await sellerService.listings(userId, req.body);

    res.status(201).json({ success: true, message: "listings successful" });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.listings";
    next(appError);
  }
};

export const updateListing = async (
  req: TypedRequest<typeof UpdateListingSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;
  const listingId = req.params.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: true, message: "unauthorized" });
    }

    const data = await sellerService.updateListing(userId, listingId, req.body);

    res.status(200).json({ success: true, message: "listing updated", data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.updateListing";
    next(appError);
  }
};

export const deleteListing = async (
  req: TypedRequest<typeof DeleteListingSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;
  const listingId = req.params.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    await sellerService.deleteListing(userId, listingId);

    res.status(200).json({ success: true, message: "listing deleted" });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.deleteListing";
    next(appError);
  }
};

export const importInventoryKeys = async (
  req: TypedRequest<typeof ImportInventoryKeysSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await sellerService.importInventoryKeys(userId, req.body);

    res.status(201).json({ success: true, message: "keys imported", data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.importInventoryKeys";
    next(appError);
  }
};

export const importInventoryAccounts = async (
  req: TypedRequest<typeof ImportInventoryAccountsSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await sellerService.importInventoryAccounts(userId, req.body);

    res.status(201).json({ success: true, message: "accounts imported", data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.importInventoryAccounts";
    next(appError);
  }
};

export const getInventory = async (
  req: TypedRequest<typeof GetInventorySchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await sellerService.getInventory(userId, req.query);

    res.status(200).json({ success: true, data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.getInventory";
    next(appError);
  }
};

export const getOrders = async (
  req: TypedRequest<typeof GetSellerOrdersSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await sellerService.getOrders(userId, req.query);

    res.status(200).json({ success: true, data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.getOrders";
    next(appError);
  }
};

export const getOrder = async (
  req: TypedRequest<typeof GetSellerOrderSchema>,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.sub;
  const orderId = req.params.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const data = await sellerService.getOrder(userId, orderId);

    res.status(200).json({ success: true, data });
  } catch (err) {
    const appError = err as AppError;
    appError.origin = "sellerController.getOrder";
    next(appError);
  }
};
