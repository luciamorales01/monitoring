-- AlterTable
ALTER TABLE "Monitor"
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastResponseTime" INTEGER;
