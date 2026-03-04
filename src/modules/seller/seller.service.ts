import prisma from "../../../prisma/prisma-client.js";
import {
  InventoryItemStatus,
  PaymentStatus,
  ProductType,
} from "../../generated/prisma/index.js";
import { createError } from "../../shared/utils/create-error.js";

type CreateListingDto = {
  type: ProductType;
  title: string;
  description: string;
  price: number;
};

type UpdateListingDto = Partial<CreateListingDto> & {
  isActive?: boolean;
};

type ImportKeysDto = {
  productId: string;
  keys: string[];
};

type ImportAccountItem = {
  login: string;
  password: string;
  email?: string;
  additionalData?: Record<string, string>;
};

type ImportAccountsDto = {
  productId: string;
  accounts: ImportAccountItem[];
};

type GetInventoryQueryDto = {
  productId?: string;
  status?: InventoryItemStatus;
};

type GetSellerOrdersQueryDto = {
  status?: PaymentStatus;
};

class SellerService {
  private async getSellerProduct(
    userId: string,
    productId: string,
    expectedType?: ProductType,
  ) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!product) {
      throw createError("listing not found", 404);
    }

    if (expectedType && product.type !== expectedType) {
      throw createError(`listing type must be ${expectedType}`, 400);
    }

    return product;
  }

  async listings(userId: string, dto: CreateListingDto) {
    await prisma.product.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async updateListing(
    userId: string,
    listingId: string,
    dto: UpdateListingDto,
  ) {
    const listing = await prisma.product.findFirst({
      where: {
        id: listingId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!listing) {
      throw createError("listing not found", 404);
    }

    return prisma.product.update({
      where: {
        id: listingId,
      },
      data: dto,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        price: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async deleteListing(userId: string, listingId: string) {
    await this.getSellerProduct(userId, listingId);

    const ordersCount = await prisma.order.count({
      where: {
        productId: listingId,
      },
    });

    if (ordersCount > 0) {
      throw createError("listing with orders cannot be deleted", 400);
    }

    await prisma.$transaction([
      prisma.inventoryItem.deleteMany({
        where: {
          productId: listingId,
        },
      }),
      prisma.product.delete({
        where: {
          id: listingId,
        },
      }),
    ]);
  }

  async importInventoryKeys(userId: string, dto: ImportKeysDto) {
    await this.getSellerProduct(userId, dto.productId, ProductType.KEY);

    const result = await prisma.inventoryItem.createMany({
      data: dto.keys.map((key) => ({
        productId: dto.productId,
        content: { key },
      })),
    });

    return {
      productId: dto.productId,
      importedCount: result.count,
    };
  }

  async importInventoryAccounts(userId: string, dto: ImportAccountsDto) {
    await this.getSellerProduct(userId, dto.productId, ProductType.ACCOUNT);

    const result = await prisma.inventoryItem.createMany({
      data: dto.accounts.map((account) => ({
        productId: dto.productId,
        content: account,
      })),
    });

    return {
      productId: dto.productId,
      importedCount: result.count,
    };
  }

  async getInventory(userId: string, query: GetInventoryQueryDto) {
    return await prisma.inventoryItem.findMany({
      where: {
        product: {
          userId,
        },
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true,
        productId: true,
        status: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            title: true,
            type: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getOrders(userId: string, query: GetSellerOrdersQueryDto) {
    return await prisma.order.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        product: {
          userId,
        },
      },
      select: {
        id: true,
        status: true,
        productId: true,
        inventoryItemId: true,
        priceAtSale: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
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
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        product: {
          userId,
        },
      },
      select: {
        id: true,
        status: true,
        productId: true,
        inventoryItemId: true,
        priceAtSale: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
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
            id: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw createError("order not found", 404);
    }

    return order;
  }
}

export default new SellerService();
