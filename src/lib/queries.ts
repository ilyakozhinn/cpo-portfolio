import { prisma } from "@/lib/prisma";
import { getAssignedProjectIds } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import {
  DEPARTMENTS,
  type Department,
  isCLevel,
  roleToDepartment,
} from "@/lib/permissions";
import { getWeekStart, toWeekKey } from "@/lib/week";

export async function getCurrentWeekStart(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "currentWeekStart" },
  });

  if (setting?.value) {
    return setting.value;
  }

  const weekStart = toWeekKey(new Date());
  await prisma.appSetting.upsert({
    where: { key: "currentWeekStart" },
    update: { value: weekStart },
    create: { key: "currentWeekStart", value: weekStart },
  });

  return weekStart;
}

export async function setCurrentWeekStart(weekStart: string) {
  await prisma.appSetting.upsert({
    where: { key: "currentWeekStart" },
    update: { value: weekStart },
    create: { key: "currentWeekStart", value: weekStart },
  });
}

export type RagValue = "green" | "yellow" | "red" | "none";

const RAG_PRIORITY: Record<RagValue, number> = {
  none: 0,
  green: 1,
  yellow: 2,
  red: 3,
};

export function resolveProjectRag(
  ragOverride: string | null | undefined,
  departmentRags: (string | null | undefined)[],
): RagValue {
  if (ragOverride) return ragOverride as RagValue;

  let worst: RagValue = "none";
  for (const rag of departmentRags) {
    if (!rag) continue;
    const value = rag as RagValue;
    if (RAG_PRIORITY[value] > RAG_PRIORITY[worst]) {
      worst = value;
    }
  }
  return worst;
}

export function statusKey(projectId: string, department: Department) {
  return `${projectId}:${department}`;
}

export async function getPortfolioSnapshot(weekStart?: string, user?: SessionUser) {
  const currentWeek = weekStart ?? (await getCurrentWeekStart());
  const assignedIds =
    user && !isCLevel(user.role)
      ? await getAssignedProjectIds(user.id)
      : null;

  const [units, allocations, people, statusesThisWeek] = await Promise.all([
    prisma.businessUnit.findMany({
      orderBy: { priority: "asc" },
      include: {
        projects: {
          orderBy: { priority: "asc" },
          include: {
            owner: true,
            weeklyStatuses: {
              orderBy: { weekStart: "desc" },
              take: 9,
              include: { author: true },
            },
            decisions: {
              orderBy: { createdAt: "desc" },
              take: 3,
            },
          },
        },
      },
    }),
    prisma.allocation.findMany({
      where: { weekStart: currentWeek },
      include: { person: true, project: true },
    }),
    prisma.person.findMany({
      orderBy: { name: "asc" },
      include: {
        ownedProjects: true,
        allocations: {
          where: { weekStart: currentWeek },
          include: { project: true },
        },
      },
    }),
    prisma.weeklyStatus.findMany({
      where: { weekStart: currentWeek },
      include: { author: true },
    }),
  ]);

  const filteredUnits = units.map((unit) => ({
    ...unit,
    projects: unit.projects.filter((project) => {
      if (!assignedIds) return true;
      return assignedIds.includes(project.id);
    }),
  }));

  const activeProjects = filteredUnits
    .flatMap((unit) => unit.projects)
    .filter((project) => project.lifecycle === "active");

  const statusByProjectDept = new Map(
    statusesThisWeek.map((status) => [
      statusKey(status.projectId, status.department as Department),
      status,
    ]),
  );

  const departmentStats = DEPARTMENTS.map((department) => {
    const submitted = activeProjects.filter((project) =>
      statusByProjectDept.has(statusKey(project.id, department)),
    ).length;
    return { department, submitted, total: activeProjects.length };
  });

  const totalSlots = activeProjects.length * DEPARTMENTS.length;
  const submittedCount = statusesThisWeek.filter((status) =>
    activeProjects.some((project) => project.id === status.projectId),
  ).length;

  const missingByDepartment = DEPARTMENTS.map((department) => ({
    department,
    projects: activeProjects.filter(
      (project) => !statusByProjectDept.has(statusKey(project.id, department)),
    ),
  }));

  const asks = statusesThisWeek
    .filter((status) => status.askToCpo?.trim())
    .map((status) => ({
      projectId: status.projectId,
      department: status.department as Department,
      ask: status.askToCpo!,
    }));

  const personLoad = people.map((person) => {
    const total = person.allocations.reduce(
      (sum, allocation) => sum + allocation.percent,
      0,
    );
    return { person, total, overallocated: total > 100 };
  });

  return {
    currentWeek,
    units: filteredUnits,
    activeProjects,
    submittedCount,
    totalSlots,
    departmentStats,
    missingByDepartment,
    asks,
    allocations,
    people,
    personLoad,
    overallocatedPeople: personLoad.filter((item) => item.overallocated),
    statusByProjectDept,
  };
}

export async function getUserStatusContext(user: SessionUser, weekStart?: string) {
  const currentWeek = weekStart ?? (await getCurrentWeekStart());
  const department = roleToDepartment(user.role);
  const assignedIds = await getAssignedProjectIds(user.id);

  const projects = await prisma.project.findMany({
    where: {
      id: { in: assignedIds },
      lifecycle: "active",
    },
    orderBy: { priority: "asc" },
    include: {
      businessUnit: true,
      owner: true,
      weeklyStatuses: {
        where: {
          weekStart: currentWeek,
          ...(department ? { department } : {}),
        },
        include: { author: true },
      },
    },
  });

  const statuses = department
    ? await prisma.weeklyStatus.findMany({
        where: { weekStart: currentWeek, department },
      })
    : [];

  const submittedCount = department
    ? projects.filter((project) =>
        project.weeklyStatuses.some((status) => status.department === department),
      ).length
    : 0;

  return {
    currentWeek,
    department,
    projects,
    submittedCount,
    totalAssigned: projects.length,
    statuses,
  };
}

export async function getProjectDetail(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      businessUnit: true,
      owner: true,
      weeklyStatuses: {
        orderBy: [{ weekStart: "desc" }, { department: "asc" }],
        include: { author: true },
      },
      decisions: { orderBy: { createdAt: "desc" } },
      allocations: {
        include: { person: true },
        orderBy: { weekStart: "desc" },
      },
    },
  });
}

export async function getPeopleHeatmap(weeks: string[]) {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    include: {
      allocations: {
        where: { weekStart: { in: weeks } },
        include: { project: true },
      },
    },
  });

  return people.map((person) => {
    const weekTotals = weeks.map((weekStart) => {
      const weekAllocations = person.allocations.filter(
        (allocation) => allocation.weekStart === weekStart,
      );
      const total = weekAllocations.reduce(
        (sum, allocation) => sum + allocation.percent,
        0,
      );
      return { weekStart, total, allocations: weekAllocations };
    });
    return { person, weekTotals };
  });
}

export async function resetToCurrentCalendarWeek() {
  await setCurrentWeekStart(toWeekKey(getWeekStart()));
}

export async function getAdminData() {
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: { project: true },
        },
      },
    }),
    prisma.project.findMany({
      where: { lifecycle: "active" },
      orderBy: { priority: "asc" },
      include: { businessUnit: true },
    }),
  ]);

  return { users, projects };
}
