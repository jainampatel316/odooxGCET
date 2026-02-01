-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'INITIAL_STOCK';
ALTER TYPE "StockMovementType" ADD VALUE 'STOCK_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'STOCK_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION_RELEASE';

-- DropForeignKey
ALTER TABLE "InventoryLog" DROP CONSTRAINT "InventoryLog_productId_fkey";

-- AlterTable
ALTER TABLE "InventoryLog" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "reservationId" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "variantId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryLog_variantId_idx" ON "InventoryLog"("variantId");

-- CreateIndex
CREATE INDEX "InventoryLog_orderId_idx" ON "InventoryLog"("orderId");

-- CreateIndex
CREATE INDEX "InventoryLog_reservationId_idx" ON "InventoryLog"("reservationId");

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RentalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
