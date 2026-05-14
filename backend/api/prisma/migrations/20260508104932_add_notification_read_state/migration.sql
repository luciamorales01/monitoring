-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NotificationEvent_readAt_createdAt_idx" ON "NotificationEvent"("readAt", "createdAt");
