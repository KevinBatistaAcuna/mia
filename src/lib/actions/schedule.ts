"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  children,
  contractSlotKinds,
  scheduleSlots,
  slotKinds,
  weekCycles,
  type ContractSlotKind,
  type SlotKind,
  type Specialty,
  type WeekCycle,
} from "@/db/schema";
import { requireEditor, requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { getSettings, specialtyExists } from "@/lib/actions/settings";
import { CONTRACT_SLOT_LABELS, DEFAULT_ACTIVE_WEEKDAYS } from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAllowedWeekdays() {
  const settings = await getSettings();
  return settings?.activeWeekdays ?? [...DEFAULT_ACTIVE_WEEKDAYS];
}

function isContractKind(kind: string): kind is ContractSlotKind {
  return (contractSlotKinds as readonly string[]).includes(kind);
}

function displayNameForSlot(kind: SlotKind, childName: string | null) {
  if (kind === "session") return childName ?? "Sin niño";
  return CONTRACT_SLOT_LABELS[kind];
}

/** Form value: `session:<childId>` or `almuerzo` / `cafe` / `administrativo` / `libre`. */
function parseAssignmentValue(raw: string): {
  kind: SlotKind;
  childId: string | null;
} | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("session:")) {
    const childId = value.slice("session:".length);
    if (!childId) return null;
    return { kind: "session", childId };
  }

  if (!isContractKind(value)) return null;
  return { kind: value, childId: null };
}

export async function listScheduleSlots(weekCycle?: WeekCycle) {
  await requireUser();
  const rows = await db
    .select({
      id: scheduleSlots.id,
      childId: scheduleSlots.childId,
      childName: children.name,
      childActive: children.active,
      kind: scheduleSlots.kind,
      specialty: scheduleSlots.specialty,
      weekday: scheduleSlots.weekday,
      time: scheduleSlots.time,
      weekCycle: scheduleSlots.weekCycle,
    })
    .from(scheduleSlots)
    .leftJoin(children, eq(scheduleSlots.childId, children.id))
    .orderBy(
      asc(scheduleSlots.weekCycle),
      asc(scheduleSlots.specialty),
      asc(scheduleSlots.weekday),
      asc(scheduleSlots.time),
    );

  const mapped = rows.map((row) => ({
    id: row.id,
    childId: row.childId,
    childName: displayNameForSlot(row.kind, row.childName),
    childActive: row.kind === "session" ? Boolean(row.childActive) : true,
    kind: row.kind,
    specialty: row.specialty,
    weekday: row.weekday,
    time: row.time,
    weekCycle: row.weekCycle,
  }));

  return weekCycle ? mapped.filter((r) => r.weekCycle === weekCycle) : mapped;
}

export async function createSlotAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const assignment = parseAssignmentValue(
    String(formData.get("assignment") ?? ""),
  );
  const specialtyFromForm = String(formData.get("specialty") ?? "") as Specialty;
  const weekday = Number(formData.get("weekday"));
  const time = String(formData.get("time") ?? "").trim();
  const weekCycle = String(formData.get("weekCycle") ?? "") as WeekCycle;

  if (!assignment || !time || Number.isNaN(weekday)) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (!weekCycles.includes(weekCycle)) {
    return { ok: false, error: "Datos inválidos." };
  }

  if (!(await specialtyExists(specialtyFromForm))) {
    return { ok: false, error: "Especialidad inválida." };
  }
  if (!slotKinds.includes(assignment.kind)) {
    return { ok: false, error: "Datos inválidos." };
  }

  const allowedWeekdays = await getAllowedWeekdays();
  if (!allowedWeekdays.includes(weekday)) {
    return { ok: false, error: "Ese día no está activo en la agenda." };
  }

  if (assignment.kind === "session") {
    if (!assignment.childId) {
      return { ok: false, error: "Selecciona un niño." };
    }
    const [child] = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.id, assignment.childId))
      .limit(1);
    if (!child) return { ok: false, error: "Niño no encontrado." };

    const [sameChild] = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.childId, assignment.childId),
          eq(scheduleSlots.specialty, specialtyFromForm),
          eq(scheduleSlots.weekday, weekday),
          eq(scheduleSlots.time, time),
          eq(scheduleSlots.weekCycle, weekCycle),
        ),
      )
      .limit(1);
    if (sameChild) {
      return {
        ok: false,
        error: "Ese niño ya tiene ese horario en esta especialidad y semana.",
      };
    }
  } else {
    const [taken] = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.kind, assignment.kind),
          eq(scheduleSlots.specialty, specialtyFromForm),
          eq(scheduleSlots.weekday, weekday),
          eq(scheduleSlots.time, time),
          eq(scheduleSlots.weekCycle, weekCycle),
        ),
      )
      .limit(1);
    if (taken) {
      return {
        ok: false,
        error: "Ese bloque ya está agendado en esa especialidad, hora y semana.",
      };
    }
  }

  await db.insert(scheduleSlots).values({
    id: createId(),
    childId: assignment.kind === "session" ? assignment.childId : null,
    kind: assignment.kind,
    specialty: specialtyFromForm,
    weekday,
    time,
    weekCycle,
  });

  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function reassignSlotAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const slotId = String(formData.get("slotId") ?? "");
  const childId = String(formData.get("childId") ?? "");

  if (!slotId || !childId) {
    return { ok: false, error: "Datos incompletos." };
  }

  const [slot] = await db
    .select({ id: scheduleSlots.id, kind: scheduleSlots.kind })
    .from(scheduleSlots)
    .where(eq(scheduleSlots.id, slotId))
    .limit(1);
  if (!slot) return { ok: false, error: "Horario no encontrado." };
  if (slot.kind !== "session") {
    return {
      ok: false,
      error: "Los bloques de contrato no se reasignan a un niño.",
    };
  }

  await db
    .update(scheduleSlots)
    .set({ childId, kind: "session" })
    .where(eq(scheduleSlots.id, slotId));

  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function updateSlotAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const slotId = String(formData.get("slotId") ?? "");
  const assignment = parseAssignmentValue(
    String(formData.get("assignment") ?? ""),
  );
  const specialtyFromForm = String(formData.get("specialty") ?? "") as Specialty;
  const weekday = Number(formData.get("weekday"));
  const time = String(formData.get("time") ?? "").trim();
  const weekCycle = String(formData.get("weekCycle") ?? "") as WeekCycle;

  if (!slotId || !assignment || !time || Number.isNaN(weekday)) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (!weekCycles.includes(weekCycle)) {
    return { ok: false, error: "Datos inválidos." };
  }

  if (!(await specialtyExists(specialtyFromForm))) {
    return { ok: false, error: "Especialidad inválida." };
  }

  const allowedWeekdays = await getAllowedWeekdays();
  if (!allowedWeekdays.includes(weekday)) {
    return { ok: false, error: "Ese día no está activo en la agenda." };
  }

  if (assignment.kind === "session") {
    if (!assignment.childId) {
      return { ok: false, error: "Selecciona un niño." };
    }

    const [sameChild] = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.childId, assignment.childId),
          eq(scheduleSlots.specialty, specialtyFromForm),
          eq(scheduleSlots.weekday, weekday),
          eq(scheduleSlots.time, time),
          eq(scheduleSlots.weekCycle, weekCycle),
        ),
      )
      .limit(1);
    if (sameChild && sameChild.id !== slotId) {
      return {
        ok: false,
        error: "Ese niño ya tiene ese horario en esta especialidad y semana.",
      };
    }
  } else {
    const [taken] = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.kind, assignment.kind),
          eq(scheduleSlots.specialty, specialtyFromForm),
          eq(scheduleSlots.weekday, weekday),
          eq(scheduleSlots.time, time),
          eq(scheduleSlots.weekCycle, weekCycle),
        ),
      )
      .limit(1);
    if (taken && taken.id !== slotId) {
      return {
        ok: false,
        error: "Ese bloque ya está agendado en esa especialidad, hora y semana.",
      };
    }
  }

  await db
    .update(scheduleSlots)
    .set({
      childId: assignment.kind === "session" ? assignment.childId : null,
      kind: assignment.kind,
      specialty: specialtyFromForm,
      weekday,
      time,
      weekCycle,
    })
    .where(eq(scheduleSlots.id, slotId));

  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function deleteSlotAction(slotId: string): Promise<ActionResult> {
  await requireEditor();
  if (!slotId) return { ok: false, error: "Slot inválido." };

  await db.delete(scheduleSlots).where(eq(scheduleSlots.id, slotId));
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function getSlotsForDate(date: string, weekCycle: WeekCycle) {
  await requireUser();
  const weekday = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).getDay();

  if (weekday === 0) return [];

  return db
    .select({
      id: scheduleSlots.id,
      childId: scheduleSlots.childId,
      childName: children.name,
      specialty: scheduleSlots.specialty,
      weekday: scheduleSlots.weekday,
      time: scheduleSlots.time,
      weekCycle: scheduleSlots.weekCycle,
    })
    .from(scheduleSlots)
    .innerJoin(children, eq(scheduleSlots.childId, children.id))
    .where(
      and(
        eq(scheduleSlots.weekCycle, weekCycle),
        eq(scheduleSlots.weekday, weekday),
        eq(scheduleSlots.kind, "session"),
        eq(children.active, true),
      ),
    )
    .orderBy(asc(scheduleSlots.specialty), asc(scheduleSlots.time));
}
