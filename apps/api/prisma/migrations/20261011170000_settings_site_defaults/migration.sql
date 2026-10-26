-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "appTitle" TEXT NOT NULL DEFAULT 'Gestion Intégrée Magasin',
ADD COLUMN     "enginInspectionMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "rotationExtendWeeks" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "siteLabel" TEXT NOT NULL DEFAULT 'MC01 Benguerir';
