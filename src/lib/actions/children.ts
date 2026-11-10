"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listChildren(includeInactive = true) {
  await requireUser();
  const rows = await db.select().from(children).orderBy(asc(children.name));
  return includeInactive ? rows : rows.filter((c) => c.active);
}

export async function createChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  await db.insert(children).values({
    id: createId(),
    name,
    active: true,
  });

  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function updateChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!id || !name) return { ok: false, error: "Datos incompletos." };

  await db
    .update(children)
    .set({ name, active })
    .where(eq(children.id, id));

  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  revalidatePath("/reportes");
  return { ok: true };
}

export async function toggleChildActiveAction(id: string, active: boolean) {
  await requireUser();
  await db.update(children).set({ active }).where(eq(children.id, id));
  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
}
