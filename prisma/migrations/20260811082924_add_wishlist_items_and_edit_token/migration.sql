-- AlterTable
ALTER TABLE "PreOrder" ADD COLUMN "editToken" TEXT;

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "PreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_preOrderId_productId_key" ON "WishlistItem"("preOrderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PreOrder_editToken_key" ON "PreOrder"("editToken");

