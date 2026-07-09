import {
  addWeeks,
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";

export function getWeekStart(date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function toWeekKey(date: Date): string {
  return format(getWeekStart(date), "yyyy-MM-dd");
}

export function parseWeekKey(weekStart: string): Date {
  return parseISO(weekStart);
}

export function formatWeekLabel(weekStart: string): string {
  const start = parseWeekKey(weekStart);
  const end = getWeekEnd(start);
  const week = getISOWeek(start);
  const year = getISOWeekYear(start);
  return `Неделя W${week} ${year} · ${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM yyyy", { locale: ru })}`;
}

export function formatWeekShort(weekStart: string): string {
  const start = parseWeekKey(weekStart);
  const end = getWeekEnd(start);
  return `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM", { locale: ru })}`;
}

export function shiftWeek(weekStart: string, delta: number): string {
  return toWeekKey(addWeeks(parseWeekKey(weekStart), delta));
}

export function getRecentWeeks(count = 6, fromDate = new Date()): string[] {
  const current = getWeekStart(fromDate);
  return Array.from({ length: count }, (_, i) =>
    toWeekKey(addWeeks(current, -i)),
  );
}
