/*
  Warnings:

  - Made the column `description` on table `Section` required. This step will fail if there are existing NULL values in that column.
  - Made the column `icon` on table `Section` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "icon" SET DEFAULT 'folder';

-- CreateIndex
CREATE INDEX "Section_organizationId_idx" ON "Section"("organizationId");

-- CreateIndex
CREATE INDEX "SectionMonitor_monitorId_idx" ON "SectionMonitor"("monitorId");
