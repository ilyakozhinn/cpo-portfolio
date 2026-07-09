"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  user,
}: {
  children: React.ReactNode;
  currentWeek: string;
  user: { name: string; role: UserRole };
}) {
  const pathname = usePathname();
  const navItems = isCLevel(user.role) ? cLevelNav : departmentNav;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {isCLevel(user.role) ? "CPO Command Center" : "Портфель проектов"}
            </h1>
            <p className="break-words text-sm text-slate-500">
              {user.name} · {ROLE_LABELS[user.role]} · {formatWeekLabel(currentWeek)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCLevel(user.role) ? (
              <>
                <form action={goToPreviousWeek.bind(null, currentWeek)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm hover:bg-slate-50 sm:px-3"
                  >
                    ← Неделя
                  </button>
                </form>
                <form action={goToTodayWeek}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm hover:bg-slate-50 sm:px-3"
                  >
                    Сегодня
                  </button>
                </form>
                <form action={goToNextWeek.bind(null, currentWeek)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm hover:bg-slate-50 sm:px-3"
                  >
                    Неделя →
                  </button>
                </form>
              </>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm hover:bg-slate-50 sm:px-3"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
        <nav className="border-t border-slate-100">
          <div className="-mx-0 flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:mx-auto sm:px-4 [scrollbar-width:thin]">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-atom-soft text-atom-ink"
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
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
