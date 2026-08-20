-- DropIndex
DROP INDEX "_DigestCollections_B_index";

-- DropIndex
DROP INDEX "_DigestCollections_AB_unique";

-- DropIndex
DROP INDEX "_DigestRecommended_B_index";

-- DropIndex
DROP INDEX "_DigestRecommended_AB_unique";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "variantGroupName" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DigestCollections";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DigestRecommended";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailTemplateSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "renderedHtml" TEXT,
    "recipientCount" INTEGER,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EmailDigest" ("createdAt", "generatedAt", "id", "recipientCount", "renderedHtml", "status", "updatedAt") SELECT "createdAt", "generatedAt", "id", "recipientCount", "renderedHtml", "status", "updatedAt" FROM "EmailDigest";
DROP TABLE "EmailDigest";
ALTER TABLE "new_EmailDigest" RENAME TO "EmailDigest";
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "logoUrl" TEXT,
    "eventName" TEXT,
    "eventLocation" TEXT,
    "eventInfo" TEXT,
    "countdownTargetAt" DATETIME,
    "preorderInfoHtml" TEXT,
    "emailContactUrl" TEXT,
    "emailShippingPolicyUrl" TEXT,
    "emailWebsiteUrl" TEXT,
    "emailInstagramUrl" TEXT,
    "reminderBatchSentAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSettings" ("countdownTargetAt", "emailContactUrl", "emailInstagramUrl", "emailShippingPolicyUrl", "emailWebsiteUrl", "eventInfo", "eventLocation", "eventName", "id", "logoUrl", "preorderInfoHtml", "reminderBatchSentAt", "updatedAt") SELECT "countdownTargetAt", "emailContactUrl", "emailInstagramUrl", "emailShippingPolicyUrl", "emailWebsiteUrl", "eventInfo", "eventLocation", "eventName", "id", "logoUrl", "preorderInfoHtml", "reminderBatchSentAt", "updatedAt" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_kind_key" ON "EmailTemplate"("kind");
