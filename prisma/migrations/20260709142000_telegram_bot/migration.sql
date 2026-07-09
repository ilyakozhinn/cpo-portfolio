-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramPendingUser" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "lastMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPendingUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramPendingUser_telegramId_key" ON "TelegramPendingUser"("telegramId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramSession" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "userId" TEXT,
    "step" TEXT NOT NULL DEFAULT 'idle',
    "projectId" TEXT,
    "weekStart" TEXT,
    "draftRag" TEXT,
    "draftProgress" TEXT,
    "draftTasks" TEXT,
    "draftRisks" TEXT,
    "draftBlockers" TEXT,
    "draftAskToCpo" TEXT,
    "draftMilestone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramSession_telegramId_key" ON "TelegramSession"("telegramId");
CREATE INDEX IF NOT EXISTS "TelegramSession_userId_idx" ON "TelegramSession"("userId");

DO $$ BEGIN
  ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
