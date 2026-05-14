-- Remove deprecated monitor fields now that checks run once per monitor.
ALTER TABLE "Monitor"
DROP COLUMN "locations",
DROP COLUMN "keyword";
