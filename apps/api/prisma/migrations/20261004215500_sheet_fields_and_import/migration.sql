-- AlterTable
ALTER TABLE "StockSheet" ADD COLUMN     "destinationArea" TEXT,
ADD COLUMN     "destinationZone" TEXT,
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "supplier" TEXT;

-- AlterTable
ALTER TABLE "StockSheetPhoto" ADD COLUMN     "externalUrl" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL,
ALTER COLUMN "size" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StockSheet_sourceRef_key" ON "StockSheet"("sourceRef");

