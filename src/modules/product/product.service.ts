import prisma from "../../../prisma/prisma-client.js";
import { createError } from "../../shared/utils/create-error.js";

class ProductService {
  async getAllActiveProducts() {
    const data = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        title: true,
        price: true,
      },
    });

    return data;
  }

  async getProduct(id: string) {
    const data = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        price: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!data) {
      throw createError("product not found", 404);
    }

    const availableInventoryCount = await prisma.inventoryItem.count({
      where: {
        productId: data.id,
        status: "AVAILABLE",
      },
    });

    return {
      ...data,
      availableInventoryCount,
    };
  }
}

export default new ProductService();
