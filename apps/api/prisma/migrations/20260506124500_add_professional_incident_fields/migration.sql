CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE "Incident"
ADD COLUMN "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "acknowledgedById" INTEGER,
ADD COLUMN "resolutionNote" TEXT,
ADD COLUMN "rootCause" TEXT;

CREATE INDEX "Incident_acknowledgedById_idx" ON "Incident"("acknowledgedById");
CREATE INDEX "Incident_severity_status_startedAt_idx" ON "Incident"("severity", "status", "startedAt");

ALTER TABLE "Incident"
ADD CONSTRAINT "Incident_acknowledgedById_fkey"
FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
