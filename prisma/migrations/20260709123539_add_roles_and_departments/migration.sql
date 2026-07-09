/*
  Warnings:

  - Added the required column `department` to the `WeeklyStatus` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeeklyStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "rag" TEXT NOT NULL,
    "progress" TEXT,
    "tasks" TEXT,
    "risks" TEXT,
    "blockers" TEXT,
    "askToCpo" TEXT,
    "nextMilestone" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyStatus_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WeeklyStatus" ("askToCpo", "blockers", "createdAt", "id", "nextMilestone", "progress", "projectId", "rag", "risks", "updatedAt", "weekStart") SELECT "askToCpo", "blockers", "createdAt", "id", "nextMilestone", "progress", "projectId", "rag", "risks", "updatedAt", "weekStart" FROM "WeeklyStatus";
DROP TABLE "WeeklyStatus";
ALTER TABLE "new_WeeklyStatus" RENAME TO "WeeklyStatus";
CREATE INDEX "WeeklyStatus_weekStart_idx" ON "WeeklyStatus"("weekStart");
CREATE INDEX "WeeklyStatus_department_idx" ON "WeeklyStatus"("department");
CREATE UNIQUE INDEX "WeeklyStatus_projectId_weekStart_department_key" ON "WeeklyStatus"("projectId", "weekStart", "department");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_userId_projectId_key" ON "ProjectAssignment"("userId", "projectId");
