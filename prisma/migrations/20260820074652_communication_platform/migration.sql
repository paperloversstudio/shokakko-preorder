-- AlterTable
ALTER TABLE "Product" ADD COLUMN "lastNotifiedStatus" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "reminderBatchSentAt" DATETIME;

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "preOrderId" TEXT,
    "digestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "EmailLog_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "PreOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailLog_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "EmailDigest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT NOT NULL DEFAULT 'Shokakko Australia — Latest Updates',
    "karenNotesHtml" TEXT,
    "showKarenNotes" BOOLEAN NOT NULL DEFAULT false,
    "showCollections" BOOLEAN NOT NULL DEFAULT false,
    "showRecommended" BOOLEAN NOT NULL DEFAULT false,
    "showNewProducts" BOOLEAN NOT NULL DEFAULT false,
    "showPriceUpdates" BOOLEAN NOT NULL DEFAULT false,
    "showSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "ctaText" TEXT NOT NULL DEFAULT 'View New Products',
    "ctaUrl" TEXT NOT NULL DEFAULT '/',
    "renderedHtml" TEXT,
    "recipientCount" INTEGER,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EmailDigest" ("createdAt", "ctaText", "ctaUrl", "generatedAt", "id", "karenNotesHtml", "recipientCount", "renderedHtml", "showCollections", "showKarenNotes", "showNewProducts", "showPriceUpdates", "showRecommended", "status", "subject", "updatedAt") SELECT "createdAt", "ctaText", "ctaUrl", "generatedAt", "id", "karenNotesHtml", "recipientCount", "renderedHtml", "showCollections", "showKarenNotes", "showNewProducts", "showPriceUpdates", "showRecommended", "status", "subject", "updatedAt" FROM "EmailDigest";
DROP TABLE "EmailDigest";
ALTER TABLE "new_EmailDigest" RENAME TO "EmailDigest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_template_sentAt_idx" ON "EmailLog"("template", "sentAt");
