UPDATE "Monitor"
SET "type" = 'HTTPS'
WHERE "type"::text IN ('SSL', 'TCP', 'DNS');

ALTER TABLE "Monitor"
DROP COLUMN IF EXISTS "tcpPort",
DROP COLUMN IF EXISTS "sslWarningDays",
DROP COLUMN IF EXISTS "dnsRecordType",
DROP COLUMN IF EXISTS "dnsExpectedValue";

ALTER TABLE "Monitor" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Monitor" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

DROP TYPE "MonitorType";
CREATE TYPE "MonitorType" AS ENUM ('HTTP', 'HTTPS');

ALTER TABLE "Monitor"
ALTER COLUMN "type" TYPE "MonitorType" USING "type"::"MonitorType";

ALTER TABLE "Monitor" ALTER COLUMN "type" SET DEFAULT 'HTTPS';
