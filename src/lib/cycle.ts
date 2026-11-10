import type { WeekCycle } from "@/db/schema";

/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/** Monday=1 ... Saturday=6, Sunday=0 */
export function getWeekday(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Weeks alternate A/B from cycleStartDate's week.
 * Week 0 (the week containing cycleStartDate) = A, then B, A, ...
 */
export function getWeekCycle(
  dateStr: string,
  cycleStartDate: string,
): WeekCycle {
  const target = startOfWeekMonday(parseLocalDate(dateStr));
  const start = startOfWeekMonday(parseLocalDate(cycleStartDate));
  const diffMs = target.getTime() - start.getTime();
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const normalized = ((weeks % 2) + 2) % 2;
  return normalized === 0 ? "A" : "B";
}

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
