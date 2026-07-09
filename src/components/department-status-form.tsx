import { saveWeeklyStatus } from "@/lib/actions";
import type { Department } from "@/lib/permissions";

type Status = {
  rag: string;
  progress: string | null;
  tasks: string | null;
  risks: string | null;
  blockers: string | null;
  askToCpo: string | null;
  nextMilestone: string | null;
};

export function DepartmentStatusForm({
  projectId,
  weekStart,
  department,
  status,
  showAsk = true,
}: {
  projectId: string;
  weekStart: string;
  department: Department;
  status?: Status;
  showAsk?: boolean;
}) {
  return (
    <form action={saveWeeklyStatus} className="mt-4 space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="department" value={department} />
      <label className="block text-sm">
        <span className="text-slate-600">Статус</span>
        <select
          name="rag"
          defaultValue={status?.rag ?? "green"}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="green">Зелёный</option>
          <option value="yellow">Жёлтый</option>
          <option value="red">Красный</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Прогресс / что сделано</span>
        <textarea
          name="progress"
          rows={3}
          defaultValue={status?.progress ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Задачи на неделю</span>
        <textarea
          name="tasks"
          rows={3}
          defaultValue={status?.tasks ?? ""}
          placeholder="Ключевые задачи отдела на эту неделю"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Риски</span>
        <textarea
          name="risks"
          rows={2}
          defaultValue={status?.risks ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Блокеры</span>
        <textarea
          name="blockers"
          rows={2}
          defaultValue={status?.blockers ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      {showAsk ? (
        <label className="block text-sm">
          <span className="text-slate-600">Ask к CPO</span>
          <textarea
            name="askToCpo"
            rows={2}
            defaultValue={status?.askToCpo ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="text-slate-600">Следующий milestone</span>
        <input
          name="nextMilestone"
          defaultValue={status?.nextMilestone ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover"
      >
        Сохранить статус
      </button>
    </form>
  );
}
