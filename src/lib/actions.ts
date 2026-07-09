"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCLevel, requireUser } from "@/lib/auth";
import { refreshProjectAiSummary } from "@/lib/deepseek";
import { setCurrentWeekStart } from "@/lib/queries";
import {
  canEditDepartmentStatus,
  type Department,
  isCLevel,
  roleToDepartment,
} from "@/lib/permissions";

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

export async function saveWeeklyStatus(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const weekStart = String(formData.get("weekStart") ?? "");
  const department = String(formData.get("department") ?? "") as Department;
  const rag = String(formData.get("rag") ?? "green");
  const progress = String(formData.get("progress") ?? "").trim() || null;
  const tasks = String(formData.get("tasks") ?? "").trim() || null;
  const risks = String(formData.get("risks") ?? "").trim() || null;
  const blockers = String(formData.get("blockers") ?? "").trim() || null;
  const askToCpo = String(formData.get("askToCpo") ?? "").trim() || null;
  const nextMilestone = String(formData.get("nextMilestone") ?? "").trim() || null;

  if (!canEditDepartmentStatus(user.role, department)) {
    throw new Error("Нет доступа к этому отделу");
  }

  if (!isCLevel(user.role)) {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    });
    if (!assignment) {
      throw new Error("Проект не назначен пользователю");
    }

    const userDepartment = roleToDepartment(user.role);
    if (userDepartment !== department) {
      throw new Error("Можно заполнять только статус своего отдела");
    }
  }

  await prisma.weeklyStatus.upsert({
    where: {
      projectId_weekStart_department: { projectId, weekStart, department },
    },
    update: {
      rag,
      progress,
      tasks,
      risks,
      blockers,
      askToCpo,
      nextMilestone,
      authorId: user.id,
    },
    create: {
      projectId,
      weekStart,
      department,
      rag,
      progress,
      tasks,
      risks,
      blockers,
      askToCpo,
      nextMilestone,
      authorId: user.id,
    },
  });

  try {
    await refreshProjectAiSummary(projectId, weekStart);
  } catch (error) {
    console.error("AI summary refresh failed", error);
  }

  revalidateAll();
}

export async function saveAllocation(formData: FormData) {
  await requireCLevel();
  const personId = String(formData.get("personId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const weekStart = String(formData.get("weekStart") ?? "");
  const percent = Number(formData.get("percent") ?? 0);

  if (!personId || !projectId || !weekStart) return;

  if (percent <= 0) {
    await prisma.allocation.deleteMany({
      where: { personId, projectId, weekStart },
    });
  } else {
    await prisma.allocation.upsert({
      where: {
        personId_projectId_weekStart: { personId, projectId, weekStart },
      },
      update: { percent },
      create: { personId, projectId, weekStart, percent },
    });
  }

  revalidateAll();
}

export async function updateProject(formData: FormData) {
  await requireCLevel();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim() || null;
  const lifecycle = String(formData.get("lifecycle") ?? "active");
  const strategicWeight = Number(formData.get("strategicWeight") ?? 3);
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;
  const ragOverride = String(formData.get("ragOverride") ?? "").trim() || null;

  await prisma.project.update({
    where: { id },
    data: {
      name,
      domain,
      lifecycle,
      strategicWeight,
      ownerId,
      ragOverride: ragOverride === "none" ? null : ragOverride,
    },
  });

  revalidateAll();
}

export async function createPerson(formData: FormData) {
  await requireCLevel();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const fte = Number(formData.get("fte") ?? 1);

  if (!name) return;

  await prisma.person.create({ data: { name, role, fte } });
  revalidateAll();
}

export async function createProject(formData: FormData) {
  await requireCLevel();
  const name = String(formData.get("name") ?? "").trim();
  const businessUnitId = String(formData.get("businessUnitId") ?? "");
  const domain = String(formData.get("domain") ?? "").trim() || null;
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;

  if (!name || !businessUnitId) return;

  const maxPriority = await prisma.project.aggregate({ _max: { priority: true } });

  await prisma.project.create({
    data: {
      name,
      domain,
      ownerId,
      businessUnitId,
      priority: (maxPriority._max.priority ?? 0) + 1,
    },
  });

  revalidateAll();
}

export async function addDecision(formData: FormData) {
  await requireCLevel();
  const projectId = String(formData.get("projectId") ?? "");
  const type = String(formData.get("type") ?? "note");
  const comment = String(formData.get("comment") ?? "").trim() || null;

  await prisma.decision.create({ data: { projectId, type, comment } });

  if (type === "pause") {
    await prisma.project.update({
      where: { id: projectId },
      data: { lifecycle: "paused" },
    });
  }

  if (type === "resume") {
    await prisma.project.update({
      where: { id: projectId },
      data: { lifecycle: "active" },
    });
  }

  revalidateAll();
}

export async function moveProjectPriority(
  projectId: string,
  direction: "up" | "down",
) {
  await requireCLevel();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const neighbor = await prisma.project.findFirst({
    where: {
      lifecycle: project.lifecycle,
      priority: direction === "up" ? { lt: project.priority } : { gt: project.priority },
    },
    orderBy: { priority: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) return;

  await prisma.$transaction([
    prisma.project.update({
      where: { id: project.id },
      data: { priority: neighbor.priority },
    }),
    prisma.project.update({
      where: { id: neighbor.id },
      data: { priority: project.priority },
    }),
  ]);

  revalidateAll();
}

export async function updateStrategicWeightFromForm(formData: FormData) {
  await requireCLevel();
  const projectId = String(formData.get("projectId") ?? "");
  const weight = Number(formData.get("weight") ?? 3);
  if (!projectId) return;

  await prisma.project.update({
    where: { id: projectId },
    data: { strategicWeight: weight },
  });
  revalidateAll();
}

export async function setWeekStart(formData: FormData) {
  await requireCLevel();
  const weekStart = String(formData.get("weekStart") ?? "").trim();
  if (!weekStart) return;
  await setCurrentWeekStart(weekStart);
  revalidateAll();
}
