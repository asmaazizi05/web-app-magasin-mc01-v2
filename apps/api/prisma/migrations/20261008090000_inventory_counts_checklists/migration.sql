-- CreateEnum
CREATE TYPE "PurchaseScope" AS ENUM ('OCP', 'CESSION', 'JESA', 'ANNEXE_D');

-- CreateEnum
CREATE TYPE "InventoryLineStatus" AS ENUM ('A_VALIDER', 'DEMANDE_DESIGNATION', 'VALIDEE', 'REJETEE');

-- AlterEnum
ALTER TYPE "ArticleOrigin" ADD VALUE 'ANNEXE_D';

-- AlterTable
ALTER TABLE "Engin" ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "storekeeperId" INTEGER NOT NULL,
    "countedAt" DATE NOT NULL,
    "location" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountLine" (
    "id" SERIAL NOT NULL,
    "countId" INTEGER NOT NULL,
    "articleId" INTEGER,
    "enteredReference" TEXT,
    "enteredDesignation" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "purchaseScope" "PurchaseScope" NOT NULL,
    "status" "InventoryLineStatus" NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "stockBefore" INTEGER,
    "stockAfter" INTEGER,
    "movementNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_number_key" ON "InventoryCount"("number");

-- CreateIndex
CREATE INDEX "InventoryCountLine_status_idx" ON "InventoryCountLine"("status");

-- CreateIndex
CREATE INDEX "InventoryCountLine_articleId_idx" ON "InventoryCountLine"("articleId");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

