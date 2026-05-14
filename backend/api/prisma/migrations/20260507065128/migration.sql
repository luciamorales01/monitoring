/*
  Warnings:

  - You are about to drop the column `acknowledgedAt` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `acknowledgedById` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `resolutionNote` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `rootCause` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserInvitation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_acknowledgedById_fkey";

-- DropForeignKey
ALTER TABLE "UserInvitation" DROP CONSTRAINT "UserInvitation_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "UserInvitation" DROP CONSTRAINT "UserInvitation_organizationId_fkey";

-- DropIndex
DROP INDEX "Incident_acknowledgedById_idx";

-- DropIndex
DROP INDEX "Incident_severity_status_startedAt_idx";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "acknowledgedAt",
DROP COLUMN "acknowledgedById",
DROP COLUMN "resolutionNote",
DROP COLUMN "rootCause",
DROP COLUMN "severity";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "UserInvitation";

-- DropEnum
DROP TYPE "AuditAction";

-- DropEnum
DROP TYPE "IncidentSeverity";
