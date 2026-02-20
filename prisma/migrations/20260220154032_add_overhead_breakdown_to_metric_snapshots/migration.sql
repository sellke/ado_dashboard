-- AlterTable
ALTER TABLE "metric_snapshots" ADD COLUMN     "bugHours" DOUBLE PRECISION,
ADD COLUMN     "ceremonyHours" DOUBLE PRECISION,
ADD COLUMN     "spikeHours" DOUBLE PRECISION,
ADD COLUMN     "supportHours" DOUBLE PRECISION;
