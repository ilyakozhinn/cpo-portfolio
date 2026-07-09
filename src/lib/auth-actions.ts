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

function adminRedirect(params: { success?: string; error?: string }): never {
  const search = new URLSearchParams();
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  const qs = search.toString();
  redirect(qs ? `/admin?${qs}` : "/admin");
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
    adminRedirect({ error: "fill_required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    adminRedirect({ error: "email_taken" });
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
  adminRedirect({ success: "user_created" });
}

export async function toggleUserActive(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!userId) {
    adminRedirect({ error: "missing_user" });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  revalidateAll();
  adminRedirect({ success: isActive ? "user_activated" : "user_blocked" });
}

export async function resetUserPassword(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || !password) {
    adminRedirect({ error: "password_required" });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidateAll();
  adminRedirect({ success: "password_reset" });
}

export async function assignProject(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!userId || !projectId) {
    adminRedirect({ error: "project_required" });
  }

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    update: {},
    create: { userId, projectId },
  });

  revalidateAll();
  adminRedirect({ success: "project_assigned" });
}

export async function removeProjectAssignment(formData: FormData) {
  await requireCLevel();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) {
    adminRedirect({ error: "missing_assignment" });
  }

  await prisma.projectAssignment.delete({ where: { id: assignmentId } });
  revalidateAll();
  adminRedirect({ success: "assignment_removed" });
}

export async function linkTelegramToUser(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  const telegramId = String(formData.get("telegramId") ?? "").trim();
  const telegramUsername =
    String(formData.get("telegramUsername") ?? "").trim() || null;
  if (!userId || !telegramId) {
    adminRedirect({ error: "telegram_required" });
  }

  const existing = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: userId } },
  });
  if (existing) {
    adminRedirect({ error: "telegram_taken" });
  }

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    adminRedirect({ error: "missing_user" });
  }

  if (current.telegramId && current.telegramId !== telegramId) {
    await prisma.telegramSession.deleteMany({
      where: { telegramId: current.telegramId },
    });
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
  adminRedirect({ success: "telegram_linked" });
}

export async function unlinkTelegram(formData: FormData) {
  await requireCLevel();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    adminRedirect({ error: "missing_user" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramId) {
    adminRedirect({ error: "telegram_missing" });
  }

  await prisma.telegramSession.deleteMany({
    where: { telegramId: user.telegramId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { telegramId: null, telegramUsername: null },
  });

  revalidateAll();
  adminRedirect({ success: "telegram_unlinked" });
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

  if (!pendingId) {
    adminRedirect({ error: "pending_missing" });
  }

  const pending = await prisma.telegramPendingUser.findUnique({
    where: { id: pendingId },
  });
  if (!pending) {
    adminRedirect({ error: "pending_missing" });
  }

  const telegramTaken = await prisma.user.findFirst({
    where: {
      telegramId: pending.telegramId,
      ...(existingUserId ? { NOT: { id: existingUserId } } : {}),
    },
  });
  if (telegramTaken) {
    adminRedirect({ error: "telegram_taken" });
  }

  try {
    if (existingUserId) {
      if (!USER_ROLES.includes(role)) {
        adminRedirect({ error: "role_required" });
      }

      const target = await prisma.user.findUnique({
        where: { id: existingUserId },
      });
      if (!target) {
        adminRedirect({ error: "missing_user" });
      }

      await prisma.user.update({
        where: { id: existingUserId },
        data: {
          telegramId: pending.telegramId,
          telegramUsername: pending.username,
          role,
        },
      });

      if (target.telegramId && target.telegramId !== pending.telegramId) {
        await prisma.telegramSession.deleteMany({
          where: { telegramId: target.telegramId },
        });
      }

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
      if (!name || !email || !USER_ROLES.includes(role)) {
        adminRedirect({ error: "approve_fields" });
      }

      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        adminRedirect({ error: "email_taken" });
      }

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
  } catch (error) {
    console.error("approveTelegramPending failed", error);
    adminRedirect({ error: "approve_failed" });
  }

  revalidateAll();
  adminRedirect({
    success: existingUserId ? "telegram_linked" : "access_granted",
  });
}

export async function dismissTelegramPending(formData: FormData) {
  await requireCLevel();
  const pendingId = String(formData.get("pendingId") ?? "");
  if (!pendingId) {
    adminRedirect({ error: "pending_missing" });
  }
  await prisma.telegramPendingUser.delete({ where: { id: pendingId } });
  revalidateAll();
  adminRedirect({ success: "pending_dismissed" });
}
