-- AlterTable
ALTER TABLE "TelegramSession" ADD COLUMN IF NOT EXISTS "draftPreviousCheck" TEXT;
ALTER TABLE "TelegramSession" ADD COLUMN IF NOT EXISTS "followUpQuestion" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectWeeklySummary" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "aiRag" TEXT NOT NULL,
    "previousTasksCheck" TEXT,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWeeklySummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectWeeklySummary_projectId_weekStart_key"
  ON "ProjectWeeklySummary"("projectId", "weekStart");

CREATE INDEX IF NOT EXISTS "ProjectWeeklySummary_weekStart_idx"
  ON "ProjectWeeklySummary"("weekStart");

DO $$ BEGIN
  ALTER TABLE "ProjectWeeklySummary" ADD CONSTRAINT "ProjectWeeklySummary_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
