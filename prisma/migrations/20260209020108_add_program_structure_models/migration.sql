-- CreateTable
CREATE TABLE "workstreams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adoAreaPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workstreams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adoIterationPath" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_workstreams" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "plannedPoints" DOUBLE PRECISION,
    "completedPoints" DOUBLE PRECISION,
    "grossHours" DOUBLE PRECISION,
    "ptoHours" DOUBLE PRECISION,
    "ceremonyHours" DOUBLE PRECISION,
    "fteCount" INTEGER,
    "capacityLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprint_workstreams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sprint_workstreams_sprintId_workstreamId_key" ON "sprint_workstreams"("sprintId", "workstreamId");

-- AddForeignKey
ALTER TABLE "sprint_workstreams" ADD CONSTRAINT "sprint_workstreams_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_workstreams" ADD CONSTRAINT "sprint_workstreams_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
