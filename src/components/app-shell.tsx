import Link from "next/link";
import { logout } from "@/lib/auth-actions";
import { formatWeekLabel } from "@/lib/week";
import { goToNextWeek, goToPreviousWeek, goToTodayWeek } from "@/lib/week-actions";
import type { UserRole } from "@/lib/permissions";
import { isCLevel, ROLE_LABELS } from "@/lib/permissions";

const cLevelNav = [
  { href: "/", label: "Command Center" },
  { href: "/projects", label: "Проекты" },
  { href: "/status", label: "Статусы отделов" },
  { href: "/people", label: "Люди и загрузка" },
  { href: "/priority", label: "Приоритизация" },
  { href: "/admin", label: "Админка" },
  { href: "/settings", label: "Настройки" },
];

const departmentNav = [{ href: "/status", label: "Мой статус" }];

export function AppShell({
  children,
  currentWeek,
  pathname,
  user,
}: {
  children: React.ReactNode;
  currentWeek: string;
  pathname: string;
  user: { name: string; role: UserRole };
}) {
  const navItems = isCLevel(user.role) ? cLevelNav : departmentNav;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              ATOM Portfolio
            </p>
            <h1 className="text-xl font-semibold">
              {isCLevel(user.role) ? "CPO Command Center" : "Портфель проектов"}
            </h1>
            <p className="text-sm text-slate-500">
              {user.name} · {ROLE_LABELS[user.role]} · {formatWeekLabel(currentWeek)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCLevel(user.role) ? (
              <>
                <form action={goToPreviousWeek.bind(null, currentWeek)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    ← Неделя
                  </button>
                </form>
                <form action={goToTodayWeek}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Сегодня
                  </button>
                </form>
                <form action={goToNextWeek.bind(null, currentWeek)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Неделя →
                  </button>
                </form>
              </>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
        <nav className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-sky-100 text-sky-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
