-- AlterTable
ALTER TABLE "InventoryCount" ADD COLUMN     "post" "ShiftType";

-- AlterTable
ALTER TABLE "InventoryCountLine" ADD COLUMN     "category" TEXT,
ADD COLUMN     "photoFileName" TEXT,
ADD COLUMN     "photoName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountLine_photoFileName_key" ON "InventoryCountLine"("photoFileName");

