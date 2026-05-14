-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "alertEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertPush" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alertThreshold" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY[]::TEXT[];
