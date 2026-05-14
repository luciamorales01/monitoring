-- CreateEnum
CREATE TYPE "MonitorType" AS ENUM ('HTTP', 'HTTPS');

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DOWN', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Monitor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MonitorType" NOT NULL DEFAULT 'HTTPS',
    "target" TEXT NOT NULL,
    "expectedStatusCode" INTEGER NOT NULL DEFAULT 200,
    "frequencySeconds" INTEGER NOT NULL DEFAULT 60,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 10,
    "currentStatus" "MonitorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "id" SERIAL NOT NULL,
    "monitorId" INTEGER NOT NULL,
    "status" "MonitorStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckResult_monitorId_checkedAt_idx" ON "CheckResult"("monitorId", "checkedAt");

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckResult" ADD CONSTRAINT "CheckResult_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
