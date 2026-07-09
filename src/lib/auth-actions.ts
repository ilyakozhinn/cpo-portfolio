"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  requireCLevel,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import type { UserRole } from "@/lib/permissions";
import { USER_ROLES } from "@/lib/permissions";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath("/people");
  revalidatePath("/status");
  revalidatePath("/priority");
  revalidatePath("/settings");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    redirect("/login?error=invalid");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    redirect("/login?error=invalid");
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  });

  if (user.role === "c_level") {
    redirect("/");
  }
  redirect("/status");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  await requireCLevel();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!email || !name || !password || !USER_ROLES.includes(role)) {
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await hashPassword(password),
    },
  });

  revalidateAll();
}

export async function toggleUserActive(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  revalidateAll();
}

export async function resetUserPassword(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || !password) return;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidateAll();
}

export async function assignProject(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!userId || !projectId) return;

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    update: {},
    create: { userId, projectId },
  });

  revalidateAll();
}

export async function removeProjectAssignment(formData: FormData) {
  await requireCLevel();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return;

  await prisma.projectAssignment.delete({ where: { id: assignmentId } });
  revalidateAll();
}

export async function linkTelegramToUser(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const telegramId = String(formData.get("telegramId") ?? "").trim();
  const telegramUsername = String(formData.get("telegramUsername") ?? "").trim() || null;
  if (!userId || !telegramId) return;

  const existing = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: userId } },
  });
  if (existing) {
    throw new Error("Этот Telegram уже привязан к другому пользователю");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramId, telegramUsername },
  });

  await prisma.telegramPendingUser.deleteMany({ where: { telegramId } });
  await prisma.telegramSession.upsert({
    where: { telegramId },
    update: { userId, step: "idle" },
    create: { telegramId, userId, step: "idle" },
  });

  revalidateAll();
}

export async function unlinkTelegram(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramId) return;

  await prisma.telegramSession.deleteMany({ where: { telegramId: user.telegramId } });
  await prisma.user.update({
    where: { id: userId },
    data: { telegramId: null, telegramUsername: null },
  });

  revalidateAll();
}

export async function approveTelegramPending(formData: FormData) {
  await requireCLevel();

  const pendingId = String(formData.get("pendingId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "") || "atom2026";
  const existingUserId = String(formData.get("existingUserId") ?? "").trim();

  const pending = await prisma.telegramPendingUser.findUnique({
    where: { id: pendingId },
  });
  if (!pending) return;

  if (existingUserId) {
    await prisma.user.update({
      where: { id: existingUserId },
      data: {
        telegramId: pending.telegramId,
        telegramUsername: pending.username,
        ...(USER_ROLES.includes(role) ? { role } : {}),
      },
    });
    await prisma.telegramSession.upsert({
      where: { telegramId: pending.telegramId },
      update: { userId: existingUserId, step: "idle" },
      create: {
        telegramId: pending.telegramId,
        userId: existingUserId,
        step: "idle",
      },
    });
  } else {
    if (!name || !email || !USER_ROLES.includes(role)) return;

    const created = await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash: await hashPassword(password),
        telegramId: pending.telegramId,
        telegramUsername: pending.username,
      },
    });

    await prisma.telegramSession.upsert({
      where: { telegramId: pending.telegramId },
      update: { userId: created.id, step: "idle" },
      create: {
        telegramId: pending.telegramId,
        userId: created.id,
        step: "idle",
      },
    });
  }

  await prisma.telegramPendingUser.delete({ where: { id: pendingId } });
  revalidateAll();
}

export async function dismissTelegramPending(formData: FormData) {
  await requireCLevel();
  const pendingId = String(formData.get("pendingId") ?? "");
  if (!pendingId) return;
  await prisma.telegramPendingUser.delete({ where: { id: pendingId } });
  revalidateAll();
}
