-- CreateTable
CREATE TABLE "StockSheet" (
    "id" SERIAL NOT NULL,
    "type" "MovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "designation" TEXT NOT NULL,
    "articleId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "requesterType" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "storekeeperId" INTEGER NOT NULL,
    "post" "ShiftType" NOT NULL,
    "receptionId" INTEGER,
    "expeditionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSheetPhoto" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "StockSheetPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockSheet_receptionId_key" ON "StockSheet"("receptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StockSheet_expeditionId_key" ON "StockSheet"("expeditionId");

-- CreateIndex
CREATE INDEX "StockSheet_date_idx" ON "StockSheet"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StockSheetPhoto_fileName_key" ON "StockSheetPhoto"("fileName");

-- AddForeignKey
ALTER TABLE "StockSheet" ADD CONSTRAINT "StockSheet_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSheet" ADD CONSTRAINT "StockSheet_storekeeperId_fkey" FOREIGN KEY ("storekeeperId") REFERENCES "Storekeeper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSheet" ADD CONSTRAINT "StockSheet_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSheet" ADD CONSTRAINT "StockSheet_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSheetPhoto" ADD CONSTRAINT "StockSheetPhoto_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "StockSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
