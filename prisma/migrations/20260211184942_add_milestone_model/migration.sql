/*
  Warnings:

  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CeremonyType" AS ENUM ('Standup', 'ScrumOfScrums', 'SprintPlanning', 'BacklogRefinement');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('Risk', 'Blocker', 'Dependency', 'Theme', 'Sentiment');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NotStarted', 'InProgress', 'Done');

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";

-- DropTable
DROP TABLE "posts";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "adoFeatureId" INTEGER,
    "workstreamId" TEXT NOT NULL,
    "targetMonth" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NotStarted',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "ceremonyType" "CeremonyType" NOT NULL,
    "ceremonyDate" TIMESTAMP(3) NOT NULL,
    "sprintId" TEXT NOT NULL,
    "workstreamId" TEXT,
    "rawContent" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ceremony_insights" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "content" TEXT NOT NULL,
    "relatedWorkstreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ceremony_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_workstreamId_idx" ON "milestones"("workstreamId");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "workstreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ceremony_insights" ADD CONSTRAINT "ceremony_insights_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ceremony_insights" ADD CONSTRAINT "ceremony_insights_relatedWorkstreamId_fkey" FOREIGN KEY ("relatedWorkstreamId") REFERENCES "workstreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
