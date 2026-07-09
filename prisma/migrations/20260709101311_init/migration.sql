-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "fte" REAL NOT NULL DEFAULT 1.0,
    "skills" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "lifecycle" TEXT NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL,
    "strategicWeight" INTEGER NOT NULL DEFAULT 3,
    "ragOverride" TEXT,
    "businessUnitId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Allocation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Allocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "rag" TEXT NOT NULL,
    "progress" TEXT,
    "risks" TEXT,
    "blockers" TEXT,
    "askToCpo" TEXT,
    "nextMilestone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Project_businessUnitId_idx" ON "Project"("businessUnitId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_lifecycle_idx" ON "Project"("lifecycle");

-- CreateIndex
CREATE INDEX "Allocation_weekStart_idx" ON "Allocation"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_personId_projectId_weekStart_key" ON "Allocation"("personId", "projectId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyStatus_weekStart_idx" ON "WeeklyStatus"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyStatus_projectId_weekStart_key" ON "WeeklyStatus"("projectId", "weekStart");
