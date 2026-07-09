import { requireCLevel } from "@/lib/auth";
import Link from "next/link";
import { moveProjectPriority, updateStrategicWeightFromForm } from "@/lib/actions";
import { LifecycleBadge, RagBadge } from "@/components/ui";
import { DEPARTMENTS, type Department } from "@/lib/permissions";
import { getPortfolioSnapshot, resolveProjectRag, statusKey } from "@/lib/queries";

export default async function PriorityPage() {
  await requireCLevel();
  const snapshot = await getPortfolioSnapshot();
  const activeProjects = snapshot.units
    .flatMap((unit) =>
      unit.projects
        .filter((project) => project.lifecycle === "active")
        .map((project) => ({ project, unitName: unit.name })),
    )
    .sort((a, b) => a.project.priority - b.project.priority);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Приоритизация</h2>
        <p className="text-sm text-slate-500">
          Упорядочивание active-проектов и стратегический вес
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[64px_minmax(0,1fr)_100px_140px_100px]">
          <div>#</div>
          <div>Проект</div>
          <div>Статус</div>
          <div>Вес</div>
          <div>Действия</div>
        </div>
        {activeProjects.map(({ project, unitName }, index) => {
          const weekRags = DEPARTMENTS.map(
            (department: Department) =>
              snapshot.statusByProjectDept.get(
                statusKey(project.id, department),
              )?.rag,
          );
          const aiSummary = snapshot.aiSummaryByProject.get(project.id);
          const rag = resolveProjectRag(
            project.ragOverride,
            weekRags,
            aiSummary?.aiRag,
          );

          return (
            <div
              key={project.id}
              className="border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5 md:grid md:grid-cols-[64px_minmax(0,1fr)_100px_140px_100px] md:items-center md:gap-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3 md:mb-0">
                <div className="text-sm font-semibold text-slate-500">
                  #{index + 1}
                </div>
                <div className="md:hidden">
                  <RagBadge rag={rag} />
                </div>
              </div>
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-atom-ink hover:underline"
                >
                  {project.name}
                </Link>
                <p className="mt-1 break-words text-sm text-slate-500">
                  {unitName} · {project.owner?.name ?? "Владелец не назначен"}
                </p>
              </div>
              <div className="mt-3 hidden md:mt-0 md:block">
                <RagBadge rag={rag} />
              </div>
              <form
                action={updateStrategicWeightFromForm}
                className="mt-3 flex gap-2 md:mt-0"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <select
                  name="weight"
                  defaultValue={project.strategicWeight}
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <option key={weight} value={weight}>
                      Вес {weight}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  OK
                </button>
              </form>
              <div className="mt-3 flex gap-2 md:mt-0">
                <form action={moveProjectPriority.bind(null, project.id, "up")}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveProjectPriority.bind(null, project.id, "down")}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    ↓
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-100 p-4 sm:p-5">
        <h3 className="font-semibold">На паузе</h3>
        <div className="mt-3 space-y-2">
          {snapshot.units
            .flatMap((unit) => unit.projects)
            .filter((project) => project.lifecycle === "paused")
            .map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium hover:underline"
                >
                  {project.name}
                </Link>
                <LifecycleBadge lifecycle={project.lifecycle} />
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
