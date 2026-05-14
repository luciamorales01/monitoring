ALTER TABLE "Monitor"
ADD COLUMN IF NOT EXISTS "usesSectionSchedule" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Section"
ADD COLUMN IF NOT EXISTS "expectedStatusCode" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN IF NOT EXISTS "frequencySeconds" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS "timeoutSeconds" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "SectionMember" (
  "sectionId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SectionMember_pkey" PRIMARY KEY ("sectionId","userId")
);

CREATE INDEX IF NOT EXISTS "SectionMember_userId_idx" ON "SectionMember"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SectionMember_sectionId_fkey'
  ) THEN
    ALTER TABLE "SectionMember"
    ADD CONSTRAINT "SectionMember_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SectionMember_userId_fkey'
  ) THEN
    ALTER TABLE "SectionMember"
    ADD CONSTRAINT "SectionMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "SectionMember" ("sectionId", "userId")
SELECT s."id", u."id"
FROM "Section" s
JOIN "User" u ON u."organizationId" = s."organizationId"
ON CONFLICT DO NOTHING;
