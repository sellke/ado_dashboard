-- Add a dedicated rolling-window setting for cycle-time metrics.
ALTER TABLE "metric_engine_config"
ADD COLUMN "cycleTimeRollingWindow" INTEGER NOT NULL DEFAULT 4;
