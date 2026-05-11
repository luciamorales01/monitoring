-- Normalize language values before enforcing the new application contract.
UPDATE "User"
SET "language" = CASE
  WHEN lower("language") IN ('english', 'en') THEN 'en'
  ELSE 'es'
END;

CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

ALTER TABLE "Organization"
ADD COLUMN "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE';

ALTER TABLE "User"
ALTER COLUMN "language" SET DEFAULT 'es',
ADD COLUMN "avatarUrl" TEXT;
