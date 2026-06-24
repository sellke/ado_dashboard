-- DropIndex
DROP INDEX "workstreams_syncEnabled_idx";

-- AlterTable
ALTER TABLE "sprints" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false;
