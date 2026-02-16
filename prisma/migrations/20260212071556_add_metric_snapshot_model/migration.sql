-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "velocity" DOUBLE PRECISION,
    "overheadPercent" DOUBLE PRECISION,
    "predictability" DOUBLE PRECISION,
    "carryOverRate" DOUBLE PRECISION,
    "carryOverItems" INTEGER,
    "carryOverPoints" DOUBLE PRECISION,
    "plannedPoints" DOUBLE PRECISION,
    "completedPoints" DOUBLE PRECISION,
    "overheadHours" DOUBLE PRECISION,
    "grossHours" DOUBLE PRECISION,
    "velocityAvg" DOUBLE PRECISION,
    "overheadPercentAvg" DOUBLE PRECISION,
    "predictabilityAvg" DOUBLE PRECISION,
    "carryOverRateAvg" DOUBLE PRECISION,
    "velocityRag" TEXT,
    "overheadRag" TEXT,
    "predictabilityRag" TEXT,
    "carryOverRag" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_sprintId_idx" ON "metric_snapshots"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_sprintId_workstreamId_key" ON "metric_snapshots"("sprintId", "workstreamId");

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
