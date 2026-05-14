-- DropIndex
DROP INDEX "Section_organizationId_idx";

-- DropIndex
DROP INDEX "SectionMonitor_monitorId_idx";

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "description" DROP DEFAULT,
ALTER COLUMN "icon" DROP NOT NULL,
ALTER COLUMN "icon" DROP DEFAULT;
