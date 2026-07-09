import Link from "next/link";
import { requireCLevel } from "@/lib/auth";
import { RagBadge, StatCard } from "@/components/ui";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
} from "@/lib/permissions";
import { getPortfolioSnapshot, resolveProjectRag, statusKey } from "@/lib/queries";

export default async function HomePage() {
  const user = await requireCLevel();
  const snapshot = await getPortfolioSnapshot(undefined, user);
  const activeUnits = snapshot.units.filter((unit) => unit.name !== "На паузе");
  const pausedUnit = snapshot.units.find((unit) => unit.name === "На паузе");

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Статусы отделов за неделю"
          value={`${snapshot.submittedCount} / ${snapshot.totalSlots}`}
          hint="Всего слотов: проект × отдел"
          tone={
            snapshot.submittedCount === snapshot.totalSlots ? "success" : "warning"
          }
        />
        {snapshot.departmentStats.map((item) => (
          <StatCard
            key={item.department}
            label={DEPARTMENT_LABELS[item.department]}
            value={`${item.submitted} / ${item.total}`}
            hint="Сдано статусов"
            tone={item.submitted === item.total ? "success" : "warning"}
          />
        ))}
      </section>

      {snapshot.asks.length > 0 ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-lg font-semibold text-rose-900">
            Asks к CPO (только C-level)
          </h2>
          <ul className="mt-3 space-y-2">
            {snapshot.asks.map((ask) => {
              const project = snapshot.activeProjects.find(
                (item) => item.id === ask.projectId,
              );
              return (
                <li key={`${ask.projectId}-${ask.department}`} className="text-sm text-rose-900">
                  <Link
                    href={`/status?project=${ask.projectId}`}
                    className="font-medium underline"
                  >
                    {project?.name}
                  </Link>
                  {" · "}
                  {DEPARTMENT_LABELS[ask.department]}: {ask.ask}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {snapshot.missingByDepartment.some((item) => item.projects.length > 0) ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">
            Не сдали статус на эту неделю
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {snapshot.missingByDepartment.map((item) => (
              <div key={item.department}>
                <p className="text-sm font-medium text-amber-900">
                  {DEPARTMENT_LABELS[item.department]}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/status?project=${project.id}`}
                      className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Портфель по направлениям</h2>
        {activeUnits.map((unit) => (
          <div
            key={unit.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{unit.name}</h3>
                <p className="text-sm text-slate-500">
                  Приоритет направления: {unit.priority}
                </p>
              </div>
              {unit.priority === 1 ? (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                  Высший приоритет
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {unit.projects.map((project) => {
                const weekRags = DEPARTMENTS.map(
                  (department: Department) =>
                    snapshot.statusByProjectDept.get(
                      statusKey(project.id, department),
                    )?.rag,
                );
                const rag = resolveProjectRag(project.ragOverride, weekRags);
                const hasMissing = DEPARTMENTS.some(
                  (department) =>
                    !snapshot.statusByProjectDept.has(
                      statusKey(project.id, department),
                    ),
                );

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="rounded-lg border border-slate-200 p-4 hover:border-sky-300 hover:bg-sky-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {project.owner?.name ?? "Владелец не назначен"}
                          {project.domain ? ` · ${project.domain}` : ""}
                        </p>
                      </div>
                      <RagBadge rag={rag} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DEPARTMENTS.map((department) => {
                        const status = snapshot.statusByProjectDept.get(
                          statusKey(project.id, department),
                        );
                        return (
                          <span
                            key={department}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              status
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {DEPARTMENT_LABELS[department]}:{" "}
                            {status ? "сдан" : "ждём"}
                          </span>
                        );
                      })}
                    </div>
                    {hasMissing ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Не все отделы сдали статус
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {pausedUnit && pausedUnit.projects.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-slate-100 p-5">
          <h2 className="text-lg font-semibold">На паузе</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {pausedUnit.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <p className="font-medium">{project.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {project.owner?.name ?? "Владелец не назначен"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
