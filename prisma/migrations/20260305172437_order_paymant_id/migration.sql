/*
  Warnings:

  - You are about to drop the column `itemStatus` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[inventoryItemId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `priceAtSale` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropIndex
DROP INDEX "InventoryItem_productId_itemStatus_idx";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "itemStatus",
ADD COLUMN     "status" "InventoryItemStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "totalPrice",
ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "priceAtSale" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "isActive" SET DEFAULT false;

-- DropTable
DROP TABLE "OrderItem";

-- CreateIndex
CREATE INDEX "InventoryItem_productId_status_idx" ON "InventoryItem"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_inventoryItemId_key" ON "Order"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
