-- CreateEnum
CREATE TYPE "AbcClass" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('MECANIQUE', 'TUYAUTERIE', 'OUTILLAGE', 'ELECTRIQUE', 'CONSOMMABLES');

-- CreateEnum
CREATE TYPE "ArticleOrigin" AS ENUM ('JESA', 'OCP', 'CESSION');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('HANGAR', 'ABRI', 'EXTERIEUR', 'MODULAIRE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MATIN', 'APRES_MIDI', 'NUIT', 'OFF');

-- CreateEnum
CREATE TYPE "ReceptionStatus" AS ENUM ('VALIDE', 'CONTROLE_QUALITE');

-- CreateEnum
CREATE TYPE "ExpeditionPriority" AS ENUM ('URGENT', 'HAUTE', 'NORMALE');

-- CreateEnum
CREATE TYPE "ExpeditionStatus" AS ENUM ('EN_ATTENTE', 'EN_PICKING', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('TERMINE', 'PLANIFIE', 'A_VENIR');

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "planTitle" TEXT NOT NULL,
    "planSubtitle" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "areaM2" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "aisle" INTEGER NOT NULL,
    "aisleLabel" TEXT NOT NULL,
    "levels" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "origin" "ArticleOrigin" NOT NULL,
    "originLabel" TEXT NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "rackId" INTEGER,
    "rackLevel" INTEGER,
    "rackLocation" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "unitCostCMP" DECIMAL(12,2) NOT NULL,
    "abcClass" "AbcClass" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storekeeper" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,

    CONSTRAINT "Storekeeper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "storekeeperId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "type" "ShiftType" NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" "ReceptionStatus" NOT NULL,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "requesterService" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" "ExpeditionPriority" NOT NULL,
    "status" "ExpeditionStatus" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "servedAt" TIMESTAMP(3),
    "preparerId" INTEGER,

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "type" "MovementType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "destination" TEXT,
    "storekeeperId" INTEGER,
    "stockAfter" INTEGER NOT NULL,
    "receptionId" INTEGER,
    "expeditionId" INTEGER,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAudit" (
    "id" SERIAL NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "countedLines" INTEGER NOT NULL DEFAULT 0,
    "accurateLines" INTEGER NOT NULL DEFAULT 0,
    "countedValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "varianceValue" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "currentRotationWeek" INTEGER NOT NULL,
    "sapSystem" TEXT NOT NULL,
    "sapHost" TEXT NOT NULL,
    "sapClient" TEXT NOT NULL,
    "sapPlant" TEXT NOT NULL,
    "sapStorageLocation" TEXT NOT NULL,
    "syncIntervalMinutes" INTEGER NOT NULL,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_code_key" ON "Zone"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_position_key" ON "Zone"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_code_key" ON "Rack"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Article_code_key" ON "Article"("code");

-- CreateIndex
CREATE INDEX "Article_zoneId_idx" ON "Article"("zoneId");

-- CreateIndex
CREATE INDEX "Article_rackId_idx" ON "Article"("rackId");

-- CreateIndex
CREATE UNIQUE INDEX "Storekeeper_matricule_key" ON "Storekeeper"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_storekeeperId_weekNumber_key" ON "Shift"("storekeeperId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Reception_number_key" ON "Reception"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Expedition_number_key" ON "Expedition"("number");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_documentNumber_key" ON "StockMovement"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_receptionId_key" ON "StockMovement"("receptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_expeditionId_key" ON "StockMovement"("expeditionId");

-- CreateIndex
CREATE INDEX "StockMovement_date_idx" ON "StockMovement"("date");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Storekeeper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "Storekeeper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
