import type { AttendanceStatus, ContractSlotKind, UserRole } from "@/db/schema";

export type SpecialtyInfo = {
  id: string;
  name: string;
  shortCode: string;
  active: boolean;
  sortOrder: number;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administradora",
  assistant: "Asistente",
  therapist: "Terapeuta",
};

export const SPECIALTY_CHIP_PALETTE = [
  "bg-emerald-50 text-emerald-900 border-emerald-200",
  "bg-sky-50 text-sky-900 border-sky-200",
  "bg-amber-50 text-amber-950 border-amber-200",
  "bg-rose-50 text-rose-900 border-rose-200",
  "bg-indigo-50 text-indigo-950 border-indigo-200",
  "bg-teal-50 text-teal-950 border-teal-200",
  "bg-fuchsia-50 text-fuchsia-950 border-fuchsia-200",
  "bg-lime-50 text-lime-950 border-lime-200",
] as const;

export function specialtyChipClass(index: number) {
  return SPECIALTY_CHIP_PALETTE[index % SPECIALTY_CHIP_PALETTE.length];
}

export function specialtyLabel(
  specialtyId: string,
  catalog: SpecialtyInfo[],
) {
  return catalog.find((s) => s.id === specialtyId)?.name ?? specialtyId;
}

export function specialtyShort(
  specialtyId: string,
  catalog: SpecialtyInfo[],
) {
  return catalog.find((s) => s.id === specialtyId)?.shortCode ?? specialtyId;
}

export function specialtyChipForId(
  specialtyId: string,
  catalog: SpecialtyInfo[],
) {
  const index = catalog.findIndex((s) => s.id === specialtyId);
  return specialtyChipClass(index < 0 ? 0 : index);
}

export const CONTRACT_SLOT_LABELS: Record<ContractSlotKind, string> = {
  almuerzo: "Almuerzo",
  cafe: "Café",
  administrativo: "Administrativo",
  libre: "LB",
};

export const CONTRACT_SLOT_SHORT: Record<ContractSlotKind, string> = {
  almuerzo: "AL",
  cafe: "CF",
  administrativo: "AD",
  libre: "LB",
};

export const CONTRACT_SLOT_CHIP: Record<ContractSlotKind, string> = {
  almuerzo: "bg-orange-50 text-orange-950 border-orange-200",
  cafe: "bg-stone-100 text-stone-900 border-stone-300",
  administrativo: "bg-violet-50 text-violet-950 border-violet-200",
  libre: "bg-slate-100 text-slate-800 border-slate-300",
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

export function slugifySpecialty(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
