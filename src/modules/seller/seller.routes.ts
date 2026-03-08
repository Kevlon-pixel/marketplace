import { Router } from "express";
import authTokenMiddleware from "../auth/auth-token.middleware.js";
import { validateMiddleware } from "../../middlewares/validate.middleware.js";
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
import {
  deleteListing,
  getOrder,
  getInventory,
  getOrders,
  importInventoryAccounts,
  importInventoryKeys,
  listings,
  updateListing,
} from "./seller.controller.js";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SellerMessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *     SellerObjectResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           additionalProperties: true
 *     SellerListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             additionalProperties: true
 *     SellerErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 */

/**
 * @openapi
 * /api/seller/listings:
 *   post:
 *     tags: [Seller]
 *     summary: Create seller listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, title, description, price]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [KEY, ACCOUNT]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0.01
 *     responses:
 *       201:
 *         description: Listing created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerMessageResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.post(
  "/listings",
  authTokenMiddleware,
  validateMiddleware(ListingSchema),
  listings,
);

/**
 * @openapi
 * /api/seller/listings/{id}:
 *   patch:
 *     tags: [Seller]
 *     summary: Update seller listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [KEY, ACCOUNT]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0.01
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Listing updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerObjectResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.patch(
  "/listings/:id",
  authTokenMiddleware,
  validateMiddleware(UpdateListingSchema),
  updateListing,
);

/**
 * @openapi
 * /api/seller/listings/{id}:
 *   delete:
 *     tags: [Seller]
 *     summary: Delete seller listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Listing deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerMessageResponse'
 *       400:
 *         description: Listing cannot be deleted (e.g. has orders)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.delete(
  "/listings/:id",
  authTokenMiddleware,
  validateMiddleware(DeleteListingSchema),
  deleteListing,
);

/**
 * @openapi
 * /api/seller/inventory/keys/import:
 *   post:
 *     tags: [Seller]
 *     summary: Import key inventory items for seller listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, keys]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               keys:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   minLength: 1
 *     responses:
 *       201:
 *         description: Keys imported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerObjectResponse'
 *       400:
 *         description: Validation error or wrong listing type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.post(
  "/inventory/keys/import",
  authTokenMiddleware,
  validateMiddleware(ImportInventoryKeysSchema),
  importInventoryKeys,
);

/**
 * @openapi
 * /api/seller/inventory/accounts/import:
 *   post:
 *     tags: [Seller]
 *     summary: Import account inventory items for seller listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, accounts]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               accounts:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [login, password]
 *                   properties:
 *                     login:
 *                       type: string
 *                     password:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     additionalData:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *     responses:
 *       201:
 *         description: Accounts imported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerObjectResponse'
 *       400:
 *         description: Validation error or wrong listing type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.post(
  "/inventory/accounts/import",
  authTokenMiddleware,
  validateMiddleware(ImportInventoryAccountsSchema),
  importInventoryAccounts,
);

/**
 * @openapi
 * /api/seller/inventory:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller inventory items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, RESERVED, SOLD, DISCARDED]
 *     responses:
 *       200:
 *         description: Seller inventory list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.get(
  "/inventory",
  authTokenMiddleware,
  validateMiddleware(GetInventorySchema),
  getInventory,
);

/**
 * @openapi
 * /api/seller/orders:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *     responses:
 *       200:
 *         description: Seller orders list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.get(
  "/orders",
  authTokenMiddleware,
  validateMiddleware(GetSellerOrdersSchema),
  getOrders,
);

/**
 * @openapi
 * /api/seller/orders/{id}:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller order by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Seller order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerObjectResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerErrorResponse'
 */
router.get(
  "/orders/:id",
  authTokenMiddleware,
  validateMiddleware(GetSellerOrderSchema),
  getOrder,
);

export default router;
