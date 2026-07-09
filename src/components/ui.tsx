import { cn } from "@/lib/utils";

export function RagBadge({
  rag,
  className,
}: {
  rag: string;
  className?: string;
}) {
  const styles: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    red: "bg-rose-100 text-rose-800 border-rose-200",
    none: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const labels: Record<string, string> = {
    green: "Зелёный",
    yellow: "Жёлтый",
    red: "Красный",
    none: "Нет данных",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[rag] ?? styles.none,
        className,
      )}
    >
      {labels[rag] ?? labels.none}
    </span>
  );
}

export function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  const isPaused = lifecycle === "paused";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isPaused
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-sky-50 text-sky-700 border-sky-200",
      )}
    >
      {isPaused ? "На паузе" : "Активен"}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "border-slate-200 bg-white",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-rose-200 bg-rose-50",
    success: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", tones[tone])}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
