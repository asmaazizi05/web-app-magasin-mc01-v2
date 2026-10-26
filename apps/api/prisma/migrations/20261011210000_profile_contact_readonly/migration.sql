-- AlterTable
ALTER TABLE "AppProfile" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "readOnlyRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[];
