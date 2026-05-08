-- Fase 3: incidencias profesionales
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';

DO $$ BEGIN
  CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "severity" "IncidentSeverity" NOT NULL DEFAULT 'HIGH',
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acknowledgedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "resolvedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "rootCause" TEXT,
  ADD COLUMN IF NOT EXISTS "lastStatusChangeAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Incident_severity_status_idx" ON "Incident"("severity", "status");
