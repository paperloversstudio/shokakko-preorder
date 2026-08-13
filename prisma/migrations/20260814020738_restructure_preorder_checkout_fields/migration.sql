-- Restructure PreOrder for the checkout redesign:
--   * customerName -> customerFirstName + customerLastName
--   * shippingAddress (free text) -> shippingAddress1/2, shippingSuburb,
--     shippingState, shippingPostcode, shippingCountry
--   * billingAddress (free text, nullable) -> the same six billing* fields,
--     all nullable (null across the board still means "same as shipping")
--   * new shippingMethod ("standard" | "express")
--
-- Existing rows are backfilled best-effort, not lost: the old full name
-- goes entirely into customerFirstName (customerLastName left blank), and
-- the old free-text address goes verbatim into address line 1 (Suburb/
-- State/Postcode left blank, Country defaults to Australia) — Karen should
-- double-check and tidy up any pre-existing orders' address fields in the
-- admin after this migration runs.
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
    "unsubscribedAt" DATETIME
);
INSERT INTO "new_PreOrder" (
    "id", "orderNumber", "customerFirstName", "customerLastName", "customerEmail",
    "shippingAddress1", "shippingSuburb", "shippingState", "shippingPostcode", "shippingCountry",
    "billingAddress1",
    "shippingMethod", "notes", "status", "createdAt", "editToken", "unsubscribedAt"
)
SELECT
    "id", "orderNumber", "customerName", '', "customerEmail",
    "shippingAddress", '', '', '', 'Australia',
    "billingAddress",
    'standard', "notes", "status", "createdAt", "editToken", "unsubscribedAt"
FROM "PreOrder";
DROP TABLE "PreOrder";
ALTER TABLE "new_PreOrder" RENAME TO "PreOrder";
CREATE UNIQUE INDEX "PreOrder_orderNumber_key" ON "PreOrder"("orderNumber");
CREATE UNIQUE INDEX "PreOrder_editToken_key" ON "PreOrder"("editToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
