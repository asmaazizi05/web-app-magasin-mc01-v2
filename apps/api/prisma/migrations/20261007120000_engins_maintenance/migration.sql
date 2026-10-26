-- CreateEnum
CREATE TYPE "EnginOwnership" AS ENUM ('PROPRE', 'LOCATION');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'PANNE', 'CONTROLE_PERIODIQUE');

-- AlterEnum
ALTER TYPE "EnginStatus" ADD VALUE 'EN_PANNE';

-- AlterTable
ALTER TABLE "Engin" ADD COLUMN     "batteryCapacityAh" INTEGER,
ADD COLUMN     "batteryVoltage" INTEGER,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "capacityKg" INTEGER,
ADD COLUMN     "commissioningYear" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "energy" TEXT,
ADD COLUMN     "forkLengthMm" INTEGER,
ADD COLUMN     "hourMeter" INTEGER,
ADD COLUMN     "hourMeterAt" DATE,
ADD COLUMN     "inspectionIntervalMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "lastInspectionDate" DATE,
ADD COLUMN     "lastServiceDate" DATE,
ADD COLUMN     "lastServiceHours" INTEGER,
ADD COLUMN     "liftHeightM" DOUBLE PRECISION,
ADD COLUMN     "maxPersons" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ownerService" TEXT,
ADD COLUMN     "ownership" "EnginOwnership" NOT NULL DEFAULT 'PROPRE',
ADD COLUMN     "photoFileName" TEXT,
ADD COLUMN     "rentalCompany" TEXT,
ADD COLUMN     "rentalEndDate" DATE,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "serviceIntervalHours" INTEGER,
ADD COLUMN     "serviceIntervalMonths" INTEGER,
ADD COLUMN     "usage" TEXT,
ADD COLUMN     "weightKg" INTEGER,
ADD COLUMN     "workingHeightM" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" SERIAL NOT NULL,
    "enginId" INTEGER NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "date" DATE NOT NULL,
    "endDate" DATE,
    "hourMeter" INTEGER,
    "description" TEXT NOT NULL,
    "partsReplaced" TEXT,
    "cost" DECIMAL(12,2),
    "provider" TEXT,
    "result" TEXT,
    "fileName" TEXT,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnginCheck" (
    "id" SERIAL NOT NULL,
    "enginId" INTEGER NOT NULL,
    "storekeeperId" INTEGER,
    "operatorName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hourMeter" INTEGER,
    "items" JSONB NOT NULL,
    "allOk" BOOLEAN NOT NULL,
    "comment" TEXT,

    CONSTRAINT "EnginCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_fileName_key" ON "MaintenanceRecord"("fileName");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_enginId_date_idx" ON "MaintenanceRecord"("enginId", "date");

-- CreateIndex
CREATE INDEX "EnginCheck_enginId_date_idx" ON "EnginCheck"("enginId", "date");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "Engin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnginCheck" ADD CONSTRAINT "EnginCheck_enginId_fkey" FOREIGN KEY ("enginId") REFERENCES "Engin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnginCheck" ADD CONSTRAINT "EnginCheck_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

