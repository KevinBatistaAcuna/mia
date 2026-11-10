import type { AttendanceStatus, Specialty } from "@/db/schema";

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  fisica: "Terapia física",
  lenguaje: "Terapia de lenguaje",
  ocupacional: "Terapia ocupacional",
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

export const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  presente: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ausente_justificado: "bg-amber-100 text-amber-900 border-amber-200",
  ausente_injustificado: "bg-rose-100 text-rose-800 border-rose-200",
  tardia: "bg-sky-100 text-sky-800 border-sky-200",
  cancelacion_fundacion: "bg-slate-100 text-slate-700 border-slate-200",
};
