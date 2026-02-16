-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('Epic', 'Feature', 'UserStory', 'Task', 'Bug', 'Spike', 'Support');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('WorkItems', 'Iterations', 'Capacity', 'Full');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('Running', 'Success', 'Failed');

-- CreateTable
CREATE TABLE "threshold_configs" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "greenMin" DOUBLE PRECISION NOT NULL,
    "greenMax" DOUBLE PRECISION NOT NULL,
    "amberMin" DOUBLE PRECISION NOT NULL,
    "amberMax" DOUBLE PRECISION NOT NULL,
    "redMin" DOUBLE PRECISION,
    "redMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threshold_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "itemsFetched" INTEGER,
    "itemsCreated" INTEGER,
    "itemsUpdated" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "adoId" INTEGER NOT NULL,
    "adoRevision" INTEGER,
    "type" "WorkItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "storyPoints" DOUBLE PRECISION,
    "originalEstimate" DOUBLE PRECISION,
    "completedWork" DOUBLE PRECISION,
    "remainingWork" DOUBLE PRECISION,
    "areaPath" TEXT NOT NULL,
    "iterationPath" TEXT NOT NULL,
    "parentAdoId" INTEGER,
    "assignedTo" TEXT,
    "tags" TEXT,
    "adoCreatedDate" TIMESTAMP(3),
    "adoChangedDate" TIMESTAMP(3),
    "workstreamId" TEXT,
    "sprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "threshold_configs_metricName_key" ON "threshold_configs"("metricName");

-- CreateIndex
CREATE INDEX "sync_logs_startedAt_idx" ON "sync_logs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_items_adoId_key" ON "work_items"("adoId");

-- CreateIndex
CREATE INDEX "work_items_workstreamId_sprintId_idx" ON "work_items"("workstreamId", "sprintId");

-- CreateIndex
CREATE INDEX "work_items_type_idx" ON "work_items"("type");

-- CreateIndex
CREATE INDEX "work_items_iterationPath_idx" ON "work_items"("iterationPath");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
