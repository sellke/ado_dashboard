-- CreateTable
CREATE TABLE "sprint_plan_snapshots" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "adoId" INTEGER NOT NULL,
    "storyPoints" DOUBLE PRECISION,
    "state" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprint_plan_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sprint_plan_snapshots_sprintId_workstreamId_idx" ON "sprint_plan_snapshots"("sprintId", "workstreamId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_plan_snapshots_sprintId_workstreamId_adoId_key" ON "sprint_plan_snapshots"("sprintId", "workstreamId", "adoId");

-- AddForeignKey
ALTER TABLE "sprint_plan_snapshots" ADD CONSTRAINT "sprint_plan_snapshots_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_plan_snapshots" ADD CONSTRAINT "sprint_plan_snapshots_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
