ALTER TABLE "Monitor"
ADD COLUMN "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Monitor"
SET "nextCheckAt" = COALESCE(
  "lastCheckedAt" + ("frequencySeconds" * INTERVAL '1 second'),
  CURRENT_TIMESTAMP
);

CREATE INDEX "Monitor_isActive_nextCheckAt_idx" ON "Monitor"("isActive", "nextCheckAt");
