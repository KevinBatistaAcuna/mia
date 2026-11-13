import type { AttendanceStatus, Specialty, UserRole } from "@/db/schema";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administradora",
  assistant: "Asistente",
  therapist: "Terapeuta",
};

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  fisica: "Terapia física",
  lenguaje: "Terapia de lenguaje",
  ocupacional: "Terapia ocupacional",
};

export const SPECIALTY_SHORT: Record<Specialty, string> = {
  fisica: "TF",
  lenguaje: "TL",
  ocupacional: "TO",
};

export const SPECIALTY_CHIP: Record<Specialty, string> = {
  fisica: "bg-emerald-50 text-emerald-900 border-emerald-200",
  lenguaje: "bg-sky-50 text-sky-900 border-sky-200",
  ocupacional: "bg-amber-50 text-amber-950 border-amber-200",
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: "Presente",
  ausente_justificado: "Ausente justificado",
  ausente_injustificado: "Ausente injustificado",
  tardia: "Tardía",
  cancelacion_fundacion: "Cancelación fundación",
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/** Días que se pueden activar en configuración (lun–vie). */
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;

/** Días activos por defecto (atienden lun–mié). */
export const DEFAULT_ACTIVE_WEEKDAYS = [1, 2, 3] as const;

export function parseActiveWeekdays(raw: string | null | undefined): number[] {
  const fallback = [...DEFAULT_ACTIVE_WEEKDAYS];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const days = [
      ...new Set(
        parsed
          .map(Number)
          .filter((day) => WEEKDAYS.includes(day as (typeof WEEKDAYS)[number])),
      ),
    ].sort((a, b) => a - b);
    return days.length > 0 ? days : fallback;
  } catch {
    return fallback;
  }
}

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  presente: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ausente_justificado: "bg-amber-100 text-amber-900 border-amber-200",
  ausente_injustificado: "bg-rose-100 text-rose-800 border-rose-200",
  tardia: "bg-sky-100 text-sky-800 border-sky-200",
  cancelacion_fundacion: "bg-slate-100 text-slate-700 border-slate-200",
};
