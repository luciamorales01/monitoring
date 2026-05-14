DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('MONITOR_DOWN', 'MONITOR_RECOVERED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationEvent" (
  "id" SERIAL PRIMARY KEY,
  "monitorId" INTEGER NOT NULL,
  "incidentId" INTEGER,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT,
  "subject" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationEvent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NotificationEvent_monitorId_createdAt_idx" ON "NotificationEvent"("monitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationEvent_incidentId_idx" ON "NotificationEvent"("incidentId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_type_status_idx" ON "NotificationEvent"("type", "status");
