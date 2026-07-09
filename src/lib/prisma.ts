import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl() {
  if (!process.env.VERCEL) {
    return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  }

  const tmpDbPath = "/tmp/cpo-portfolio.db";
  const seedDbPath = path.join(process.cwd(), "prisma/dev.db");

  if (!fs.existsSync(tmpDbPath) && fs.existsSync(seedDbPath)) {
    fs.copyFileSync(seedDbPath, tmpDbPath);
  }

  return `file:${tmpDbPath}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
