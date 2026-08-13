-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productBrand" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "unitPriceCents" INTEGER,
    CONSTRAINT "OrderItem_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "PreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "preOrderId", "productBrand", "productId", "productName", "productSku", "quantity", "unitPriceCents") SELECT "id", "preOrderId", "productBrand", "productId", "productName", "productSku", "quantity", "unitPriceCents" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
