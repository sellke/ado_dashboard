-- Add nullable ADO lifecycle timestamps for cycle-time calculations.
ALTER TABLE "work_items"
ADD COLUMN "adoActivatedDate" TIMESTAMP(3),
ADD COLUMN "adoClosedDate" TIMESTAMP(3);
