import { Router } from "express";
import { getAllProducts, getProduct } from "./product.controller.js";
import { validateMiddleware } from "../../middlewares/validate.middleware.js";
import { GetProductSchema } from "./schemas/product.schema.js";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ProductListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [KEY, ACCOUNT]
 *               title:
 *                 type: string
 *               price:
 *                 type: string
 *                 description: Prisma Decimal serialized value
 *     ProductDetailsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             type:
 *               type: string
 *               enum: [KEY, ACCOUNT]
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             price:
 *               type: string
 *               description: Prisma Decimal serialized value
 *             owner:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *             availableInventoryCount:
 *               type: integer
 *               minimum: 0
 *     ErrorResponse:
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
 * /product:
 *   get:
 *     tags: [Product]
 *     summary: Get all active products
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListResponse'
 */
router.get("", getAllProducts);

/**
 * @openapi
 * /product/{id}:
 *   get:
 *     tags: [Product]
 *     summary: Get active product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductDetailsResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", validateMiddleware(GetProductSchema), getProduct);

export default router;
