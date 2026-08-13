-- AlterTable
ALTER TABLE "PreOrder" ADD COLUMN "unsubscribedAt" DATETIME;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "emailContactUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "emailHeroImageUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "emailHeroLinkUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "emailInstagramUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "emailShippingPolicyUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "emailWebsiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "EmailDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT NOT NULL DEFAULT 'Shokakko Australia — Latest Updates',
    "karenNotesHtml" TEXT,
    "showKarenNotes" BOOLEAN NOT NULL DEFAULT false,
    "showCollections" BOOLEAN NOT NULL DEFAULT false,
    "showRecommended" BOOLEAN NOT NULL DEFAULT false,
    "showNewProducts" BOOLEAN NOT NULL DEFAULT false,
    "showPriceUpdates" BOOLEAN NOT NULL DEFAULT false,
    "ctaText" TEXT NOT NULL DEFAULT 'View New Products',
    "ctaUrl" TEXT NOT NULL DEFAULT '/',
    "renderedHtml" TEXT,
    "recipientCount" INTEGER,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailDigestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "productId" TEXT,
    "kind" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "priceCents" INTEGER,
    "previousPriceCents" INTEGER,
    CONSTRAINT "EmailDigestItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "EmailDigest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailDigestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DigestCollections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DigestCollections_A_fkey" FOREIGN KEY ("A") REFERENCES "EmailDigest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DigestCollections_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DigestRecommended" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DigestRecommended_A_fkey" FOREIGN KEY ("A") REFERENCES "EmailDigest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DigestRecommended_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DigestRecipients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DigestRecipients_A_fkey" FOREIGN KEY ("A") REFERENCES "EmailDigest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DigestRecipients_B_fkey" FOREIGN KEY ("B") REFERENCES "PreOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "estimatedArrival" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "lastNotifiedPriceCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("brand", "createdAt", "currency", "description", "estimatedArrival", "id", "name", "priceCents", "sku", "sortOrder", "status", "type", "updatedAt") SELECT "brand", "createdAt", "currency", "description", "estimatedArrival", "id", "name", "priceCents", "sku", "sortOrder", "status", "type", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_DigestCollections_AB_unique" ON "_DigestCollections"("A", "B");

-- CreateIndex
CREATE INDEX "_DigestCollections_B_index" ON "_DigestCollections"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DigestRecommended_AB_unique" ON "_DigestRecommended"("A", "B");

-- CreateIndex
CREATE INDEX "_DigestRecommended_B_index" ON "_DigestRecommended"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DigestRecipients_AB_unique" ON "_DigestRecipients"("A", "B");

-- CreateIndex
CREATE INDEX "_DigestRecipients_B_index" ON "_DigestRecipients"("B");
