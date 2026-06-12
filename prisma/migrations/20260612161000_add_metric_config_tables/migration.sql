-- CreateEnum
CREATE TYPE "MetricCategory" AS ENUM ('deliveryPoints', 'overheadHours');

-- CreateTable
CREATE TABLE "metric_engine_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "velocityGreenFloor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "velocityAmberFloor" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "rollingWindow" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_engine_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_rule_config" (
    "id" TEXT NOT NULL,
    "category" "MetricCategory" NOT NULL,
    "workItemType" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_rule_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metric_engine_config_key_key" ON "metric_engine_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "metric_rule_config_category_workItemType_key" ON "metric_rule_config"("category", "workItemType");
