import { Router } from "express";
import authTokenMiddleware from "../auth/auth-token.middleware.js";
import { validateMiddleware } from "../../middlewares/validate.middleware.js";
import {
  createOrder,
  payOrder,
  getOrderSuccess,
  getOrder,
  getMyOrders,
  yooKassaWebhook,
} from "./order.controller.js";
import {
  CreateOrderSchema,
  GetOrderSchema,
  PayOrderSchema,
  YooKassaWebhookSchema,
} from "./schemas/index.js";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateOrderInput:
 *       type: object
 *       required: [productId]
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *     CreateOrderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             status:
 *               type: string
 *               enum: [PENDING, PAID, FAILED, REFUNDED]
 *             productId:
 *               type: string
 *               format: uuid
 *             inventoryItemId:
 *               type: string
 *               format: uuid
 *             priceAtSale:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *     PayOrderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             orderId:
 *               type: string
 *               format: uuid
 *             paymentId:
 *               type: string
 *             paymentStatus:
 *               type: string
 *             confirmationUrl:
 *               type: string
 *               nullable: true
 *     OrderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           nullable: true
 *         data:
 *           type: object
 *     MyOrdersResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *     YooKassaWebhookInput:
 *       type: object
 *       required: [event, object]
 *       properties:
 *         event:
 *           type: string
 *         object:
 *           type: object
 *           required: [id, status]
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               type: string
 *     YooKassaWebhookResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *     OrderErrorResponse:
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
 * /api/order:
 *   post:
 *     tags: [Order]
 *     summary: Create order for product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderInput'
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateOrderResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderErrorResponse'
 *       404:
 *         description: Product not found
 */
router.post(
  "",
  authTokenMiddleware,
  validateMiddleware(CreateOrderSchema),
  createOrder,
);

/**
 * @openapi
 * /api/order/{id}/pay:
 *   post:
 *     tags: [Order]
 *     summary: Create payment for order
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
 *         description: Payment created or reused
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayOrderResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order already processed
 */
router.post(
  "/:id/pay",
  authTokenMiddleware,
  validateMiddleware(PayOrderSchema),
  payOrder,
);

/**
 * @openapi
 * /api/order/{id}/success:
 *   get:
 *     tags: [Order]
 *     summary: Get order payment status with delivered item if paid
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
 *         description: Order payment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id/success",
  authTokenMiddleware,
  validateMiddleware(GetOrderSchema),
  getOrderSuccess,
);

/**
 * @openapi
 * /api/order/{id}:
 *   get:
 *     tags: [Order]
 *     summary: Get order details by id
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
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id",
  authTokenMiddleware,
  validateMiddleware(GetOrderSchema),
  getOrder,
);

/**
 * @openapi
 * /api/order:
 *   get:
 *     tags: [Order]
 *     summary: Get current user orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MyOrdersResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("", authTokenMiddleware, getMyOrders);

/**
 * @openapi
 * /api/order/webhook/yookassa:
 *   post:
 *     tags: [Order]
 *     summary: YooKassa webhook callback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YooKassaWebhookInput'
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YooKassaWebhookResponse'
 */
router.post(
  "/webhook/yookassa",
  validateMiddleware(YooKassaWebhookSchema),
  yooKassaWebhook,
);

export default router;
