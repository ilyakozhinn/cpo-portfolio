import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DepartmentStatusPanel } from "@/components/department-status-panel";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  isCLevel,
  roleToDepartment,
  type Department,
} from "@/lib/permissions";
import {
  getCurrentWeekStart,
  getPortfolioSnapshot,
  getUserStatusContext,
  statusKey,
} from "@/lib/queries";
import { formatWeekLabel } from "@/lib/week";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const currentWeek = await getCurrentWeekStart();

  if (isCLevel(user.role)) {
    const snapshot = await getPortfolioSnapshot(currentWeek, user);
    const selectedProjectId = params.project;
    const selectedProject = snapshot.activeProjects.find(
      (project) => project.id === selectedProjectId,
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Статусы отделов</h2>
          <p className="text-sm text-slate-500">
            {formatWeekLabel(currentWeek)} · видны все отделы (только C-level)
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Active-проекты</h3>
            <div className="mt-3 space-y-2">
              {snapshot.activeProjects.map((project) => {
                const allSubmitted = DEPARTMENTS.every((department) =>
                  snapshot.statusByProjectDept.has(
                    statusKey(project.id, department),
                  ),
                );
                return (
                  <Link
                    key={project.id}
                    href={`/status?project=${project.id}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      project.id === selectedProjectId
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <span>{project.name}</span>
                    <span
                      className={
                        allSubmitted ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {allSubmitted ? "Все сданы" : "Ждём"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {selectedProject ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">{selectedProject.name}</h3>
                  <p className="text-sm text-slate-500">
                    {selectedProject.owner?.name ?? "Владелец не назначен"}
                  </p>
                </div>
                {DEPARTMENTS.map((department) => (
                  <DepartmentStatusPanel
                    key={department}
                    department={department}
                    projectId={selectedProject.id}
                    weekStart={currentWeek}
                    status={snapshot.statusByProjectDept.get(
                      statusKey(selectedProject.id, department),
                    )}
                    canEdit
                    showAsk
                  />
                ))}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                Выберите проект слева, чтобы увидеть статусы всех отделов
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  const context = await getUserStatusContext(user, currentWeek);
  const department = roleToDepartment(user.role);
  if (!department) {
    return null;
  }

  const selectedProjectId = params.project;
  const selectedProject = context.projects.find(
    (project) => project.id === selectedProjectId,
  );
  const selectedStatus = selectedProject?.weeklyStatuses[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Мой статус</h2>
        <p className="text-sm text-slate-500">
          {formatWeekLabel(currentWeek)} · {DEPARTMENT_LABELS[department]} · сдано{" "}
          {context.submittedCount} из {context.totalAssigned}
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Мои проекты</h3>
          <div className="mt-3 space-y-2">
            {context.projects.length === 0 ? (
              <p className="text-sm text-slate-500">
                C-level ещё не назначил вам проекты. Обратитесь к администратору.
              </p>
            ) : (
              context.projects.map((project) => {
                const submitted = project.weeklyStatuses.length > 0;
                return (
                  <Link
                    key={project.id}
                    href={`/status?project=${project.id}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      project.id === selectedProjectId
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <span>{project.name}</span>
                    <span
                      className={
                        submitted ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {submitted ? "Сдан" : "Ждём"}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div>
          {selectedProject ? (
            <DepartmentStatusPanel
              department={department}
              projectId={selectedProject.id}
              weekStart={currentWeek}
              status={selectedStatus}
              canEdit
              showAsk={false}
              projectName={selectedProject.name}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
              Выберите проект, чтобы заполнить статус своего отдела
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
