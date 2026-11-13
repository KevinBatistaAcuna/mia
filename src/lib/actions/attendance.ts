"use server";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceStatuses,
  children,
  foundationSettings,
  scheduleSlots,
  type AttendanceStatus,
  type Specialty,
} from "@/db/schema";
import { requireEditor, requireUser } from "@/lib/auth";
import { getWeekCycle, getWeekday, monthBounds } from "@/lib/cycle";
import { createId } from "@/lib/id";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type DayAttendanceItem = {
  slotId: string;
  childId: string;
  childName: string;
  specialty: Specialty;
  time: string;
  status: AttendanceStatus | null;
  attendanceId: string | null;
};

export async function getDayAttendance(
  date: string,
  specialty?: Specialty,
): Promise<{
  weekCycle: "A" | "B";
  weekday: number;
  items: DayAttendanceItem[];
}> {
  await requireUser();
  const [settings] = await db.select().from(foundationSettings).limit(1);
  if (!settings) {
    return { weekCycle: "A", weekday: getWeekday(date), items: [] };
  }

  const weekCycle = getWeekCycle(date, settings.cycleStartDate);
  const weekday = getWeekday(date);

  if (weekday === 0) {
    return { weekCycle, weekday, items: [] };
  }

  const slots = await db
    .select({
      slotId: scheduleSlots.id,
      childId: scheduleSlots.childId,
      childName: children.name,
      specialty: scheduleSlots.specialty,
      time: scheduleSlots.time,
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

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.date, date));

  const bySlot = new Map(records.map((r) => [r.slotId, r]));

  let items: DayAttendanceItem[] = slots.map((slot) => {
    const record = bySlot.get(slot.slotId);
    return {
      slotId: slot.slotId,
      childId: slot.childId,
      childName: slot.childName,
      specialty: slot.specialty,
      time: slot.time,
      status: record?.status ?? null,
      attendanceId: record?.id ?? null,
    };
  });

  if (specialty) {
    items = items.filter((i) => i.specialty === specialty);
  }

  return { weekCycle, weekday, items };
}

export async function markAttendanceAction(
  date: string,
  slotIds: string[],
  status: AttendanceStatus,
): Promise<ActionResult> {
  const user = await requireEditor();

  if (!date || slotIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un niño." };
  }
  if (!attendanceStatuses.includes(status)) {
    return { ok: false, error: "Estado inválido." };
  }

  const allSlots = await db.select().from(scheduleSlots);
  const selected = allSlots.filter((s) => slotIds.includes(s.id));

  if (selected.length === 0) {
    return { ok: false, error: "No se encontraron citas." };
  }

  const now = new Date();

  for (const slot of selected) {
    const existing = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.date, date),
          eq(attendanceRecords.slotId, slot.id),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(attendanceRecords)
        .set({
          status,
          markedBy: user.id,
          updatedAt: now,
          childId: slot.childId,
          specialty: slot.specialty,
          time: slot.time,
        })
        .where(eq(attendanceRecords.id, existing[0].id));
    } else {
      await db.insert(attendanceRecords).values({
        id: createId(),
        date,
        slotId: slot.id,
        childId: slot.childId,
        specialty: slot.specialty,
        time: slot.time,
        status,
        markedBy: user.id,
        updatedAt: now,
      });
    }
  }

  revalidatePath("/asistencia");
  revalidatePath("/reportes");
  return { ok: true };
}

export async function getMonthlyReport(yearMonth: string) {
  await requireUser();
  const { start, end } = monthBounds(yearMonth);

  const records = await db
    .select({
      childId: attendanceRecords.childId,
      childName: children.name,
      specialty: attendanceRecords.specialty,
      status: attendanceRecords.status,
      date: attendanceRecords.date,
    })
    .from(attendanceRecords)
    .innerJoin(children, eq(attendanceRecords.childId, children.id))
    .where(
      and(
        gte(attendanceRecords.date, start),
        lte(attendanceRecords.date, end),
      ),
    )
    .orderBy(asc(children.name));

  type Acc = {
    childId: string;
    childName: string;
    bySpecialty: Record<
      string,
      { attended: number; counted: number; presente: number; tardia: number; ausenteJustificado: number; ausenteInjustificado: number; cancelacion: number }
    >;
    totals: { attended: number; counted: number };
  };

  const map = new Map<string, Acc>();

  for (const row of records) {
    let acc = map.get(row.childId);
    if (!acc) {
      acc = {
        childId: row.childId,
        childName: row.childName,
        bySpecialty: {},
        totals: { attended: 0, counted: 0 },
      };
      map.set(row.childId, acc);
    }

    if (!acc.bySpecialty[row.specialty]) {
      acc.bySpecialty[row.specialty] = {
        attended: 0,
        counted: 0,
        presente: 0,
        tardia: 0,
        ausenteJustificado: 0,
        ausenteInjustificado: 0,
        cancelacion: 0,
      };
    }

    const spec = acc.bySpecialty[row.specialty];

    switch (row.status) {
      case "presente":
        spec.presente += 1;
        spec.attended += 1;
        spec.counted += 1;
        acc.totals.attended += 1;
        acc.totals.counted += 1;
        break;
      case "tardia":
        spec.tardia += 1;
        spec.attended += 1;
        spec.counted += 1;
        acc.totals.attended += 1;
        acc.totals.counted += 1;
        break;
      case "ausente_justificado":
        spec.ausenteJustificado += 1;
        spec.counted += 1;
        acc.totals.counted += 1;
        break;
      case "ausente_injustificado":
        spec.ausenteInjustificado += 1;
        spec.counted += 1;
        acc.totals.counted += 1;
        break;
      case "cancelacion_fundacion":
        spec.cancelacion += 1;
        break;
    }
  }

  return Array.from(map.values()).map((acc) => ({
    ...acc,
    percentage:
      acc.totals.counted === 0
        ? null
        : Math.round((acc.totals.attended / acc.totals.counted) * 1000) / 10,
    specialties: Object.entries(acc.bySpecialty).map(([specialty, stats]) => ({
      specialty: specialty as Specialty,
      ...stats,
      percentage:
        stats.counted === 0
          ? null
          : Math.round((stats.attended / stats.counted) * 1000) / 10,
    })),
  }));
}
