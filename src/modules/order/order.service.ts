import { ICreatePayment } from "@a2seven/yoo-checkout";
import prisma from "../../../prisma/prisma-client.js";
import { PaymentStatus } from "../../generated/prisma/index.js";
import { createError } from "../../shared/utils/create-error.js";
import { YooKassa } from "../../shared/utils/payment.js";
import { randomUUID } from "crypto";
import { getOrThrowEnv } from "../../shared/utils/get-or-throw-env.js";
import { sendBoughtProductEmail } from "../../shared/utils/smtp.js";

const mapYooKassaStatusToOrderStatus = (
  status: string,
): PaymentStatus | null => {
  if (status === "succeeded") {
    return PaymentStatus.PAID;
  }

  if (status === "canceled") {
    return PaymentStatus.FAILED;
  }

  if (status === "refunded") {
    return PaymentStatus.REFUNDED;
  }

  return null;
};

class OrderService {
  async createOrder(userId: string, productId: string) {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          price: true,
        },
      });

      if (!product) {
        throw createError("product not found", 404);
      }

      if (product.userId === userId) {
        throw createError("you cannot buy your own product", 400);
      }

      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          productId: product.id,
          status: "AVAILABLE",
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (!inventoryItem) {
        throw createError("product is out of stock", 409);
      }

      const reserveResult = await tx.inventoryItem.updateMany({
        where: {
          id: inventoryItem.id,
          status: "AVAILABLE",
        },
        data: {
          status: "RESERVED",
        },
      });

      if (reserveResult.count === 0) {
        throw createError("failed to reserve product, try again", 409);
      }

      return await tx.order.create({
        data: {
          userId,
          productId: product.id,
          inventoryItemId: inventoryItem.id,
          priceAtSale: product.price,
          status: PaymentStatus.PENDING,
        },
        select: {
          id: true,
          status: true,
          productId: true,
          inventoryItemId: true,
          priceAtSale: true,
          createdAt: true,
        },
      });
    });

    return {
      ...createdOrder,
    };
  }

  async payOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        priceAtSale: true,
        paymentId: true,
        idempotenceKey: true,
      },
    });

    if (!order) {
      throw createError("order not found", 404);
    }

    if (order.status !== PaymentStatus.PENDING) {
      throw createError("order payment is already processed", 409);
    }

    const frontendUrl = getOrThrowEnv("FRONTEND_URL").replace(/\/+$/, "");

    const createPayload: ICreatePayment = {
      amount: {
        value: String(order.priceAtSale),
        currency: "RUB",
      },
      payment_method_data: {
        type: "bank_card",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${frontendUrl}/order/${orderId}/success`,
      },
      description: `Order ${order.id}`,
    };

    const idempotenceKey = randomUUID();

    const lock = await prisma.order.updateMany({
      where: {
        id: orderId,
        userId: order.userId,
        status: "PENDING",
        idempotenceKey: null,
      },
      data: {
        idempotenceKey,
      },
    });

    if (lock.count === 1) {
      const payment = await YooKassa.createPayment(
        createPayload,
        idempotenceKey,
      );

      const updated = await prisma.order.updateMany({
        where: {
          id: orderId,
          userId: order.userId,
          status: "PENDING",
        },
        data: {
          paymentId: payment.id,
        },
      });

      if (updated.count === 0) {
        throw createError("order payment is already processed", 409);
      }

      return {
        orderId: order.id,
        paymentId: payment.id,
        paymentStatus: payment.status,
        confirmationUrl: payment.confirmation?.confirmation_url ?? null,
      };
    } else {
      const newOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          priceAtSale: true,
          paymentId: true,
          idempotenceKey: true,
        },
      });

      if (!newOrder) {
        throw createError("order not found", 404);
      }

      if (!newOrder.idempotenceKey) {
        throw createError("idempotenceKey not found", 500);
      }

      if (newOrder.status !== "PENDING") {
        throw createError("order payment is already processed", 409);
      }

      const payment = await YooKassa.createPayment(
        createPayload,
        newOrder.idempotenceKey,
      );

      const updated = await prisma.order.updateMany({
        where: {
          id: orderId,
          userId: newOrder.userId,
          status: "PENDING",
        },
        data: {
          paymentId: payment.id,
        },
      });

      if (updated.count === 0) {
        throw createError("order payment is already processed", 409);
      }

      return {
        orderId: newOrder.id,
        paymentId: payment.id,
        paymentStatus: payment.status,
        confirmationUrl: payment.confirmation?.confirmation_url ?? null,
      };
    }
  }

  async getOrderStatus(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        status: true,
        paymentId: true,
        updatedAt: true,
        product: {
          select: {
            title: true,
            type: true,
          },
        },
        inventoryItem: {
          select: {
            content: true,
          },
        },
      },
    });

    if (!order) {
      throw createError("order not found", 404);
    }

    return {
      id: order.id,
      status: order.status,
      paymentId: order.paymentId,
      product: order.product,
      isWaitingPayment: order.status === PaymentStatus.PENDING,
      canRetryPayment: order.status === PaymentStatus.FAILED,
      paidAt: order.status === PaymentStatus.PAID ? order.updatedAt : null,
      item:
        order.status === PaymentStatus.PAID
          ? order.inventoryItem?.content
          : null,
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        status: true,
        productId: true,
        inventoryItemId: true,
        priceAtSale: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            title: true,
            type: true,
            price: true,
          },
        },
      },
    });

    if (!order) {
      throw createError("order not found", 404);
    }

    return {
      ...order,
      payment: {
        provider: "yoo-kassa",
        status: order.status,
      },
      isWaitingPayment: order.status === PaymentStatus.PENDING,
      successUrl:
        order.status === PaymentStatus.PAID
          ? `/order/${order.id}/success`
          : null,
    };
  }

  async getMyOrders(userId: string) {
    return await prisma.order.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        status: true,
        productId: true,
        priceAtSale: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            title: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async yooKassaWebhook(
    event: string,
    paymentId: string,
    paymentStatus: string,
  ) {
    console.log(paymentId);
    const order = await prisma.order.findFirst({
      where: {
        paymentId,
      },
      select: {
        id: true,
        status: true,
        priceAtSale: true,
        inventoryItemId: true,
        purchaseEmailSentAt: true,
        user: {
          select: {
            email: true,
          },
        },
        product: {
          select: {
            title: true,
            type: true,
          },
        },
        inventoryItem: {
          select: {
            content: true,
          },
        },
      },
    });

    console.log(order?.id);

    if (!order) {
      return { processed: false, reason: "order not found by paymentId" };
    }

    const remotePayment = await YooKassa.getPayment(paymentId);

    if (!remotePayment?.id || remotePayment.id !== paymentId) {
      return { processed: false, reason: "payment verification failed" };
    }

    if (typeof remotePayment.status !== "string") {
      return { processed: false, reason: "payment status is missing" };
    }

    if (
      typeof remotePayment.amount?.value === "string" &&
      Number(remotePayment.amount.value) !== Number(order.priceAtSale)
    ) {
      return { processed: false, reason: "payment amount mismatch" };
    }

    const webhookStatus = mapYooKassaStatusToOrderStatus(paymentStatus);
    const verifiedStatus = mapYooKassaStatusToOrderStatus(remotePayment.status);

    console.log(remotePayment.status);

    if (!verifiedStatus) {
      return { processed: true, status: order.status };
    }

    if (webhookStatus && webhookStatus !== verifiedStatus) {
      return { processed: false, reason: "webhook status mismatch" };
    }

    if (verifiedStatus === order.status) {
      if (
        verifiedStatus === PaymentStatus.PAID &&
        order.purchaseEmailSentAt === null
      ) {
        await this.sendPurchaseEmail(order);
      }

      return { processed: true, status: order.status };
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: verifiedStatus },
      });

      if (!order.inventoryItemId) {
        return;
      }

      if (verifiedStatus === PaymentStatus.PAID) {
        await tx.inventoryItem.updateMany({
          where: { id: order.inventoryItemId, status: "RESERVED" },
          data: { status: "SOLD" },
        });
      } else if (
        verifiedStatus === PaymentStatus.FAILED ||
        verifiedStatus === PaymentStatus.REFUNDED
      ) {
        await tx.inventoryItem.updateMany({
          where: { id: order.inventoryItemId, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        });
      }
    });

    if (verifiedStatus === PaymentStatus.PAID) {
      await this.sendPurchaseEmail(order);
    }

    return {
      processed: true,
      status: verifiedStatus,
      event,
    };
  }

  private async sendPurchaseEmail(order: {
    id: string;
    user: { email: string };
    product: { title: string; type: "KEY" | "ACCOUNT" };
    inventoryItem: { content: unknown } | null;
    purchaseEmailSentAt: Date | null;
  }) {
    if (order.purchaseEmailSentAt) {
      return;
    }

    if (!order.inventoryItem) {
      throw createError("inventory item not found for paid order", 500);
    }

    await sendBoughtProductEmail(
      order.user.email,
      order.product.title,
      order.product.type,
      order.inventoryItem?.content,
    );

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        purchaseEmailSentAt: new Date(),
      },
    });
  }
}

export default new OrderService();
