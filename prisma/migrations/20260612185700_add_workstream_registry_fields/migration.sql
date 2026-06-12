-- AlterTable
ALTER TABLE "workstreams"
ADD COLUMN "adoOrg" TEXT NOT NULL DEFAULT 'Operations-Innovation',
ADD COLUMN "adoProject" TEXT NOT NULL DEFAULT 'Event Streaming Platform',
ADD COLUMN "adoTeamId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Backfill team IDs from the current hardcoded sync configuration.
UPDATE "workstreams"
SET "adoTeamId" = CASE "name"
  WHEN 'Streams' THEN 'ae8bcdaa-d61b-475c-ba34-13c88b1adf8e'
  WHEN 'Action Tracker' THEN '69fee166-1ccb-43b5-afcd-5d3f08fa2198'
  WHEN 'Pitch Tracker' THEN '178ad7d2-bd20-42f9-a992-43b20dfa9b9e'
  WHEN 'KPI Services' THEN 'ad5cf6e2-be70-45e5-8e0f-366558717b46'
  WHEN 'UCM' THEN 'a30ebc14-025a-4960-be36-1eafb5a4c009'
  ELSE "adoTeamId"
END;

-- CreateTable
CREATE TABLE "sync_program_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "adoOrg" TEXT NOT NULL,
    "adoProject" TEXT NOT NULL,
    "iterationTeamId" TEXT NOT NULL,
    "lookbackSprintCount" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_program_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_program_config_key_key" ON "sync_program_config"("key");

-- CreateIndex
CREATE INDEX "workstreams_syncEnabled_idx" ON "workstreams"("syncEnabled");
