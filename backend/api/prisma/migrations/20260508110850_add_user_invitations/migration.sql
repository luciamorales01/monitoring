/*
  Warnings:

  - You are about to drop the column `readAt` on the `NotificationEvent` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "NotificationEvent_readAt_createdAt_idx";

-- AlterTable
ALTER TABLE "NotificationEvent" DROP COLUMN "readAt";

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "invitedById" INTEGER,
    "acceptedById" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_acceptedById_key" ON "UserInvitation"("acceptedById");

-- CreateIndex
CREATE INDEX "UserInvitation_organizationId_email_idx" ON "UserInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "UserInvitation_tokenHash_idx" ON "UserInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvitation_expiresAt_idx" ON "UserInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
