import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCLevel } from "@/lib/auth";
import { DepartmentStatusPanel } from "@/components/department-status-panel";
import {
  addDecision,
  saveAllocation,
  updateProject,
} from "@/lib/actions";
import { LifecycleBadge, RagBadge } from "@/components/ui";
import {
  DEPARTMENTS,
  type Department,
} from "@/lib/permissions";
import {
  getCurrentWeekStart,
  getProjectDetail,
  resolveProjectRag,
  statusKey,
} from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { formatWeekLabel } from "@/lib/week";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCLevel();
  const { id } = await params;
  const [project, currentWeek, people] = await Promise.all([
    getProjectDetail(id),
    getCurrentWeekStart(),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  const weekStatuses = await prisma.weeklyStatus.findMany({
    where: { projectId: id, weekStart: currentWeek },
    include: { author: true },
  });

  const statusMap = new Map(
    weekStatuses.map((status) => [status.department as Department, status]),
  );
  const rag = resolveProjectRag(
    project.ragOverride,
    DEPARTMENTS.map((department) => statusMap.get(department)?.rag),
  );

  const domainUrl = project.domain
    ? project.domain.startsWith("http")
      ? project.domain
      : `https://${project.domain}`
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/projects" className="text-sm text-atom-ink hover:underline">
            ← Все проекты
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <LifecycleBadge lifecycle={project.lifecycle} />
            <RagBadge rag={rag} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {project.businessUnit.name} ·{" "}
            {project.owner?.name ?? "Владелец не назначен"}
          </p>
          {domainUrl ? (
            <a
              href={domainUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-atom-ink hover:underline"
            >
              {project.domain}
            </a>
          ) : null}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Редактировать проект</h3>
          <form action={updateProject} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={project.id} />
            <label className="block text-sm">
              <span className="text-slate-600">Название</span>
              <input
                name="name"
                defaultValue={project.name}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Домен</span>
              <input
                name="domain"
                defaultValue={project.domain ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Владелец</span>
              <select
                name="ownerId"
                defaultValue={project.ownerId ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Не назначен</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-600">Статус</span>
                <select
                  name="lifecycle"
                  defaultValue={project.lifecycle}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="active">Активен</option>
                  <option value="paused">На паузе</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Стратегический вес</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  name="strategicWeight"
                  defaultValue={project.strategicWeight}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-600">RAG override (CPO)</span>
              <select
                name="ragOverride"
                defaultValue={project.ragOverride ?? "none"}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="none">Без override</option>
                <option value="green">Зелёный</option>
                <option value="yellow">Жёлтый</option>
                <option value="red">Красный</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover"
            >
              Сохранить
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">
            Статусы отделов · {formatWeekLabel(currentWeek)}
          </h3>
          {DEPARTMENTS.map((department) => (
            <DepartmentStatusPanel
              key={department}
              department={department}
              projectId={project.id}
              weekStart={currentWeek}
              status={statusMap.get(department)}
              canEdit
              showAsk
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Аллокация на неделю</h3>
        <form action={saveAllocation} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="weekStart" value={currentWeek} />
          <input type="hidden" name="projectId" value={project.id} />
          <label className="block text-sm md:col-span-2">
            <span className="text-slate-600">Человек</span>
            <select
              name="personId"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Выберите</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">% загрузки</span>
            <input
              type="number"
              min={0}
              max={100}
              name="percent"
              defaultValue={20}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Добавить
            </button>
          </div>
        </form>
        <div className="mt-4 space-y-2">
          {project.allocations
            .filter((allocation) => allocation.weekStart === currentWeek)
            .map((allocation) => (
              <div
                key={allocation.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span>{allocation.person.name}</span>
                <span className="font-medium">{allocation.percent}%</span>
              </div>
            ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">История статусов</h3>
          <div className="mt-4 space-y-3">
            {project.weeklyStatuses.length === 0 ? (
              <p className="text-sm text-slate-500">Статусов пока нет</p>
            ) : (
              project.weeklyStatuses.map((status) => (
                <div
                  key={status.id}
                  className="rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {formatWeekLabel(status.weekStart)} · {status.department}
                    </p>
                    <RagBadge rag={status.rag} />
                  </div>
                  {status.progress ? (
                    <p className="mt-2 text-slate-600">{status.progress}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Решения CPO</h3>
          <form action={addDecision} className="mt-4 space-y-3">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="block text-sm">
              <span className="text-slate-600">Тип решения</span>
              <select
                name="type"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="note">Заметка</option>
                <option value="prioritize">Поднять приоритет</option>
                <option value="pause">Поставить на паузу</option>
                <option value="resume">Возобновить</option>
                <option value="kill">Закрыть / убить</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Комментарий</span>
              <textarea
                name="comment"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Записать решение
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {project.decisions.map((decision) => (
              <div
                key={decision.id}
                className="rounded-lg border border-slate-100 p-3 text-sm"
              >
                <p className="font-medium">{decision.type}</p>
                {decision.comment ? (
                  <p className="mt-1 text-slate-600">{decision.comment}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">
                  {decision.createdAt.toLocaleString("ru-RU")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
