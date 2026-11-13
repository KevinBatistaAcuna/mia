"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  children,
  scheduleSlots,
  specialties,
  weekCycles,
  type Specialty,
  type WeekCycle,
} from "@/db/schema";
import { requireEditor, requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { getSettings } from "@/lib/actions/settings";
import { DEFAULT_ACTIVE_WEEKDAYS } from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAllowedWeekdays() {
  const settings = await getSettings();
  return settings?.activeWeekdays ?? [...DEFAULT_ACTIVE_WEEKDAYS];
}

export async function listScheduleSlots(weekCycle?: WeekCycle) {
  await requireUser();
  const rows = await db
    .select({
      id: scheduleSlots.id,
      childId: scheduleSlots.childId,
      childName: children.name,
      childActive: children.active,
      specialty: scheduleSlots.specialty,
      weekday: scheduleSlots.weekday,
      time: scheduleSlots.time,
      weekCycle: scheduleSlots.weekCycle,
    })
    .from(scheduleSlots)
    .innerJoin(children, eq(scheduleSlots.childId, children.id))
    .orderBy(
      asc(scheduleSlots.weekCycle),
      asc(scheduleSlots.specialty),
      asc(scheduleSlots.weekday),
      asc(scheduleSlots.time),
    );

  return weekCycle ? rows.filter((r) => r.weekCycle === weekCycle) : rows;
}

export async function createSlotAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const childId = String(formData.get("childId") ?? "");
  const specialty = String(formData.get("specialty") ?? "") as Specialty;
  const weekday = Number(formData.get("weekday"));
  const time = String(formData.get("time") ?? "").trim();
  const weekCycle = String(formData.get("weekCycle") ?? "") as WeekCycle;

  if (!childId || !time || Number.isNaN(weekday)) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (!specialties.includes(specialty) || !weekCycles.includes(weekCycle)) {
    return { ok: false, error: "Datos inválidos." };
  }
  const allowedWeekdays = await getAllowedWeekdays();
  if (!allowedWeekdays.includes(weekday)) {
    return { ok: false, error: "Ese día no está activo en la agenda." };
  }

  try {
    await db.insert(scheduleSlots).values({
      id: createId(),
      childId,
      specialty,
      weekday,
      time,
      weekCycle,
    });
  } catch {
    return {
      ok: false,
      error: "Ese horario ya está ocupado en esa especialidad y semana.",
    };
  }

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

  await db
    .update(scheduleSlots)
    .set({ childId })
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
  const childId = String(formData.get("childId") ?? "");
  const specialty = String(formData.get("specialty") ?? "") as Specialty;
  const weekday = Number(formData.get("weekday"));
  const time = String(formData.get("time") ?? "").trim();
  const weekCycle = String(formData.get("weekCycle") ?? "") as WeekCycle;

  if (!slotId || !childId || !time || Number.isNaN(weekday)) {
    return { ok: false, error: "Completa todos los campos." };
  }
  const allowedWeekdays = await getAllowedWeekdays();
  if (!allowedWeekdays.includes(weekday)) {
    return { ok: false, error: "Ese día no está activo en la agenda." };
  }

  try {
    await db
      .update(scheduleSlots)
      .set({ childId, specialty, weekday, time, weekCycle })
      .where(eq(scheduleSlots.id, slotId));
  } catch {
    return {
      ok: false,
      error: "Ese horario ya está ocupado en esa especialidad y semana.",
    };
  }

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
        eq(children.active, true),
      ),
    )
    .orderBy(asc(scheduleSlots.specialty), asc(scheduleSlots.time));
}
