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
        <div className="grid grid-cols-[80px_1fr_120px_160px_120px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
              className="grid grid-cols-[80px_1fr_120px_160px_120px] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0"
            >
              <div className="text-sm font-semibold text-slate-500">
                {index + 1}
              </div>
              <div>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-atom-ink hover:underline"
                >
                  {project.name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {unitName} · {project.owner?.name ?? "Владелец не назначен"}
                </p>
              </div>
              <RagBadge rag={rag} />
              <form action={updateStrategicWeightFromForm} className="flex gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <select
                  name="weight"
                  defaultValue={project.strategicWeight}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  OK
                </button>
              </form>
              <div className="flex gap-2">
                <form action={moveProjectPriority.bind(null, project.id, "up")}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveProjectPriority.bind(null, project.id, "down")}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                  >
                    ↓
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-100 p-5">
        <h3 className="font-semibold">На паузе</h3>
        <div className="mt-3 space-y-2">
          {snapshot.units
            .flatMap((unit) => unit.projects)
            .filter((project) => project.lifecycle === "paused")
            .map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
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
