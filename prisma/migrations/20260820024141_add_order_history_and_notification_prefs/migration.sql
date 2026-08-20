-- CreateTable
CREATE TABLE "OrderHistoryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderHistoryEntry_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "PreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PreOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerFirstName" TEXT NOT NULL,
    "customerLastName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "shippingAddress1" TEXT NOT NULL,
    "shippingAddress2" TEXT,
    "shippingSuburb" TEXT NOT NULL,
    "shippingState" TEXT NOT NULL,
    "shippingPostcode" TEXT NOT NULL,
    "shippingCountry" TEXT NOT NULL DEFAULT 'Australia',
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingSuburb" TEXT,
    "billingState" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "shippingMethod" TEXT NOT NULL DEFAULT 'standard',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editToken" TEXT,
    "unsubscribedAt" DATETIME,
    "notifyNewProducts" BOOLEAN NOT NULL DEFAULT true,
    "notifyPriceUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyReminderBeforeClose" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_PreOrder" ("billingAddress1", "billingAddress2", "billingCountry", "billingPostcode", "billingState", "billingSuburb", "createdAt", "customerEmail", "customerFirstName", "customerLastName", "editToken", "id", "notes", "orderNumber", "shippingAddress1", "shippingAddress2", "shippingCountry", "shippingMethod", "shippingPostcode", "shippingState", "shippingSuburb", "status", "unsubscribedAt") SELECT "billingAddress1", "billingAddress2", "billingCountry", "billingPostcode", "billingState", "billingSuburb", "createdAt", "customerEmail", "customerFirstName", "customerLastName", "editToken", "id", "notes", "orderNumber", "shippingAddress1", "shippingAddress2", "shippingCountry", "shippingMethod", "shippingPostcode", "shippingState", "shippingSuburb", "status", "unsubscribedAt" FROM "PreOrder";
DROP TABLE "PreOrder";
ALTER TABLE "new_PreOrder" RENAME TO "PreOrder";
CREATE UNIQUE INDEX "PreOrder_orderNumber_key" ON "PreOrder"("orderNumber");
CREATE UNIQUE INDEX "PreOrder_editToken_key" ON "PreOrder"("editToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
