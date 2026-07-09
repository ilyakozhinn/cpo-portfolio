import { DepartmentStatusForm } from "@/components/department-status-form";
import type { Department } from "@/lib/permissions";
import { DEPARTMENT_LABELS } from "@/lib/permissions";
import { RagBadge } from "@/components/ui";

type Status = {
  id: string;
  rag: string;
  progress: string | null;
  tasks: string | null;
  risks: string | null;
  blockers: string | null;
  askToCpo: string | null;
  nextMilestone: string | null;
  author?: { name: string } | null;
};

export function DepartmentStatusPanel({
  department,
  projectId,
  weekStart,
  status,
  canEdit,
  showAsk = true,
  projectName,
}: {
  department: Department;
  projectId: string;
  weekStart: string;
  status?: Status;
  canEdit: boolean;
  showAsk?: boolean;
  projectName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          {projectName ? (
            <p className="text-lg font-semibold">{projectName}</p>
          ) : null}
          <h3 className={projectName ? "text-sm text-slate-500" : "font-semibold"}>
            {DEPARTMENT_LABELS[department]}
          </h3>
        </div>
        <RagBadge rag={status?.rag ?? "none"} />
      </div>

      {canEdit ? (
        <DepartmentStatusForm
          projectId={projectId}
          weekStart={weekStart}
          department={department}
          status={status}
          showAsk={showAsk}
        />
      ) : status ? (
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          {status.progress ? (
            <div>
              <p className="font-medium text-slate-500">Прогресс</p>
              <p className="mt-1 whitespace-pre-wrap">{status.progress}</p>
            </div>
          ) : null}
          {status.tasks ? (
            <div>
              <p className="font-medium text-slate-500">Задачи</p>
              <p className="mt-1 whitespace-pre-wrap">{status.tasks}</p>
            </div>
          ) : null}
          {status.risks ? (
            <div>
              <p className="font-medium text-slate-500">Риски</p>
              <p className="mt-1 whitespace-pre-wrap">{status.risks}</p>
            </div>
          ) : null}
          {status.blockers ? (
            <div>
              <p className="font-medium text-slate-500">Блокеры</p>
              <p className="mt-1 whitespace-pre-wrap">{status.blockers}</p>
            </div>
          ) : null}
          {showAsk && status.askToCpo ? (
            <div>
              <p className="font-medium text-rose-600">Ask к CPO</p>
              <p className="mt-1 whitespace-pre-wrap">{status.askToCpo}</p>
            </div>
          ) : null}
          {status.nextMilestone ? (
            <div>
              <p className="font-medium text-slate-500">Следующий milestone</p>
              <p className="mt-1">{status.nextMilestone}</p>
            </div>
          ) : null}
          {status.author ? (
            <p className="text-xs text-slate-400">Автор: {status.author.name}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Статус не сдан</p>
      )}
    </div>
  );
}
