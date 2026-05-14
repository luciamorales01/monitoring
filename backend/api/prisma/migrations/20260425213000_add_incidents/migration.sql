CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "Incident" (
    "id" SERIAL NOT NULL,
    "monitorId" INTEGER NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Incident_monitorId_status_idx" ON "Incident"("monitorId", "status");
CREATE INDEX "Incident_status_startedAt_idx" ON "Incident"("status", "startedAt");

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
