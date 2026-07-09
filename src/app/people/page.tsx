import Link from "next/link";
import { requireCLevel } from "@/lib/auth";
import { createPerson, saveAllocation } from "@/lib/actions";
import { StatCard } from "@/components/ui";
import { getCurrentWeekStart, getPeopleHeatmap } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { formatWeekShort, getRecentWeeks } from "@/lib/week";

export default async function PeoplePage() {
  await requireCLevel();
  const currentWeek = await getCurrentWeekStart();
  const weeks = getRecentWeeks(6, new Date(currentWeek));
  const [heatmap, activeProjects] = await Promise.all([
    getPeopleHeatmap(weeks),
    prisma.project.findMany({
      where: { lifecycle: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentWeekOverloaded = heatmap.filter((row) => {
    const total =
      row.weekTotals.find((week) => week.weekStart === currentWeek)?.total ?? 0;
    return total > 100;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Люди и загрузка</h2>
        <p className="text-sm text-slate-500">
          Heatmap загрузки по неделям, подсветка перегрузки
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Людей в системе" value={heatmap.length} />
        <StatCard
          label="Перегружены на текущей неделе"
          value={currentWeekOverloaded.length}
          tone={currentWeekOverloaded.length > 0 ? "danger" : "success"}
        />
        <StatCard label="Active-проектов" value={activeProjects.length} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Добавить человека</h3>
        <form action={createPerson} className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <input
            name="name"
            placeholder="ФИО"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="role"
            placeholder="Роль"
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Добавить
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Аллокация на текущую неделю</h3>
        <form action={saveAllocation} className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <input type="hidden" name="weekStart" value={currentWeek} />
          <select
            name="personId"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Человек</option>
            {heatmap.map((row) => (
              <option key={row.person.id} value={row.person.id}>
                {row.person.name}
              </option>
            ))}
          </select>
          <select
            name="projectId"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Проект</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="percent"
            min={1}
            max={100}
            defaultValue={20}
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover"
          >
            Сохранить
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto [scrollbar-width:thin]">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium">
                  Человек
                </th>
                {weeks.map((weekStart) => (
                  <th key={weekStart} className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatWeekShort(weekStart)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row) => (
                <tr key={row.person.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">
                    <div className="max-w-[140px] truncate sm:max-w-none">
                      {row.person.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.person.role ?? "Роль не указана"}
                    </div>
                  </td>
                  {row.weekTotals.map((week) => {
                    const overloaded = week.total > 100;
                    const loaded = week.total > 0;
                    return (
                      <td key={week.weekStart} className="px-4 py-3">
                        <div
                          className={`rounded-lg px-3 py-2 text-center ${
                            overloaded
                              ? "bg-rose-100 text-rose-800"
                              : loaded
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {week.total > 0 ? `${week.total}%` : "—"}
                        </div>
                        {week.allocations.length > 0 ? (
                          <div className="mt-1 space-y-1 text-xs text-slate-500">
                            {week.allocations.map((allocation) => (
                              <div key={allocation.id} className="break-words">
                                <Link
                                  href={`/projects/${allocation.projectId}`}
                                  className="hover:underline"
                                >
                                  {allocation.project.name}
                                </Link>
                                : {allocation.percent}%
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
