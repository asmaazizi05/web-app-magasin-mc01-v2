-- CreateEnum
CREATE TYPE "EnginStatus" AS ENUM ('DISPONIBLE', 'MAINTENANCE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('PRESTATAIRE', 'SUPPORT_INTERNE');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PLANIFIEE', 'EN_COURS', 'SUSPENDUE', 'TERMINEE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('A_FAIRE', 'EN_COURS', 'BLOQUEE', 'TERMINEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShiftType" ADD VALUE 'CONGE';
ALTER TYPE "ShiftType" ADD VALUE 'FORMATION';
ALTER TYPE "ShiftType" ADD VALUE 'ABSENT';

-- DropIndex
DROP INDEX "Shift_storekeeperId_weekNumber_key";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "currentRotationWeek",
ADD COLUMN     "habilitationAlertDays" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
-- Conversion des 4 semaines types en semaines réelles du calendrier :
-- semaine 1 = semaine du lundi 05/10/2026, semaine 2 = 12/10, etc. (aucune affectation perdue)
ALTER TABLE "Shift" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weekStart" DATE;
UPDATE "Shift" SET "weekStart" = DATE '2026-10-05' + ("weekNumber" - 1) * 7;
ALTER TABLE "Shift" ALTER COLUMN "weekStart" SET NOT NULL,
DROP COLUMN "weekNumber";

-- AlterTable
ALTER TABLE "Storekeeper" ADD COLUMN     "fixedPost" "ShiftType",
ADD COLUMN     "hireDate" DATE,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Training" (
    "id" SERIAL NOT NULL,
    "storekeeperId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "date" DATE NOT NULL,
    "durationHours" INTEGER,
    "fileName" TEXT,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabilitationType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "validityMonths" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HabilitationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habilitation" (
    "id" SERIAL NOT NULL,
    "storekeeperId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "reference" TEXT,
    "organization" TEXT,
    "obtainedAt" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "fileName" TEXT,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habilitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engin" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "status" "EnginStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "requiredHabilitationTypeId" INTEGER,

    CONSTRAINT "Engin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "providerKind" "ProviderKind" NOT NULL,
    "company" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerPhone" TEXT,
    "zoneId" INTEGER,
    "description" TEXT,
    "plannedStart" DATE NOT NULL,
    "plannedEnd" DATE NOT NULL,
    "actualStart" DATE,
    "actualEnd" DATE,
    "status" "InterventionStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionMember" (
    "id" SERIAL NOT NULL,
    "interventionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,

    CONSTRAINT "InterventionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionTask" (
    "id" SERIAL NOT NULL,
    "interventionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plannedStart" DATE NOT NULL,
    "plannedEnd" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'A_FAIRE',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterventionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" SERIAL NOT NULL,
    "interventionId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "progressAfter" INTEGER,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EnginToInterventionTask" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EnginToInterventionTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_InterventionMemberToInterventionTask" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_InterventionMemberToInterventionTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Training_fileName_key" ON "Training"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "HabilitationType_name_key" ON "HabilitationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Habilitation_fileName_key" ON "Habilitation"("fileName");

-- CreateIndex
CREATE INDEX "Habilitation_expiresAt_idx" ON "Habilitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Engin_code_key" ON "Engin"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_code_key" ON "Intervention"("code");

-- CreateIndex
CREATE INDEX "_EnginToInterventionTask_B_index" ON "_EnginToInterventionTask"("B");

-- CreateIndex
CREATE INDEX "_InterventionMemberToInterventionTask_B_index" ON "_InterventionMemberToInterventionTask"("B");

-- CreateIndex
CREATE INDEX "Shift_weekStart_idx" ON "Shift"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_storekeeperId_weekStart_key" ON "Shift"("storekeeperId", "weekStart");

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habilitation" ADD CONSTRAINT "Habilitation_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habilitation" ADD CONSTRAINT "Habilitation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "HabilitationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engin" ADD CONSTRAINT "Engin_requiredHabilitationTypeId_fkey" FOREIGN KEY ("requiredHabilitationTypeId") REFERENCES "HabilitationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionMember" ADD CONSTRAINT "InterventionMember_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTask" ADD CONSTRAINT "InterventionTask_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "InterventionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EnginToInterventionTask" ADD CONSTRAINT "_EnginToInterventionTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Engin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EnginToInterventionTask" ADD CONSTRAINT "_EnginToInterventionTask_B_fkey" FOREIGN KEY ("B") REFERENCES "InterventionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterventionMemberToInterventionTask" ADD CONSTRAINT "_InterventionMemberToInterventionTask_A_fkey" FOREIGN KEY ("A") REFERENCES "InterventionMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterventionMemberToInterventionTask" ADD CONSTRAINT "_InterventionMemberToInterventionTask_B_fkey" FOREIGN KEY ("B") REFERENCES "InterventionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

