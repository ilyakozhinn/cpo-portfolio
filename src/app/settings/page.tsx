import { requireCLevel } from "@/lib/auth";
import { createProject, setWeekStart } from "@/lib/actions";
import { getCurrentWeekStart } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { formatWeekLabel, toWeekKey } from "@/lib/week";

export default async function SettingsPage() {
  await requireCLevel();
  const [currentWeek, units, people] = await Promise.all([
    getCurrentWeekStart(),
    prisma.businessUnit.findMany({ orderBy: { priority: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Настройки</h2>
        <p className="text-sm text-slate-500">
          Текущая отчётная неделя и быстрые действия
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Отчётная неделя</h3>
        <p className="mt-2 text-sm text-slate-600">
          Сейчас выбрана: {formatWeekLabel(currentWeek)}
        </p>
        <form action={setWeekStart} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-slate-600">Начало недели (понедельник)</span>
            <input
              type="date"
              name="weekStart"
              defaultValue={currentWeek}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Установить неделю
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Подсказка: можно также переключать неделю кнопками в шапке. Сегодня:{" "}
          {formatWeekLabel(toWeekKey(new Date()))}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Добавить проект</h3>
        <form action={createProject} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="name"
            placeholder="Название проекта"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="domain"
            placeholder="Домен (например jggl.ai)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="businessUnitId"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Направление</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <select
            name="ownerId"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Владелец</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 md:col-span-2 md:w-fit"
          >
            Создать проект
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Направления портфеля</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {units.map((unit) => (
            <li key={unit.id} className="flex justify-between border-b border-slate-100 py-2 last:border-b-0">
              <span>{unit.name}</span>
              <span className="text-slate-400">приоритет {unit.priority}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
