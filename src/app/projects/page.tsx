import Link from "next/link";
import { requireCLevel } from "@/lib/auth";
import { LifecycleBadge, RagBadge } from "@/components/ui";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
} from "@/lib/permissions";
import { getPortfolioSnapshot, resolveProjectRag, statusKey } from "@/lib/queries";

export default async function ProjectsPage() {
  const user = await requireCLevel();
  const snapshot = await getPortfolioSnapshot(undefined, user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Проекты</h2>
        <p className="text-sm text-slate-500">
          Полный портфель ATOM с владельцами и доменами
        </p>
      </div>

      {snapshot.units.map((unit) => (
        <section
          key={unit.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="font-semibold">{unit.name}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {unit.projects.map((project) => {
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
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{project.name}</p>
                      <LifecycleBadge lifecycle={project.lifecycle} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {project.owner?.name ?? "Владелец не назначен"}
                      {project.domain ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-atom-ink">{project.domain}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <RagBadge rag={rag} />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
