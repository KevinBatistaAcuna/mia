"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireEditor, requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { parseMoneyToCents } from "@/lib/money";

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
  await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const monthlyFeeCents = parseMoneyToCents(
    String(formData.get("monthlyFee") ?? ""),
  );

  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (monthlyFeeCents == null) {
    return { ok: false, error: "Ingresa un monto mensual válido." };
  }

  await db.insert(children).values({
    id: createId(),
    name,
    active: true,
    monthlyFeeCents,
  });

  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  revalidatePath("/pagos");
  return { ok: true };
}

export async function updateChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";
  const monthlyFeeCents = parseMoneyToCents(
    String(formData.get("monthlyFee") ?? ""),
  );

  if (!id || !name) return { ok: false, error: "Datos incompletos." };
  if (monthlyFeeCents == null) {
    return { ok: false, error: "Ingresa un monto mensual válido." };
  }

  await db
    .update(children)
    .set({ name, active, monthlyFeeCents })
    .where(eq(children.id, id));

  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  revalidatePath("/reportes");
  revalidatePath("/pagos");
  return { ok: true };
}

export async function toggleChildActiveAction(id: string, active: boolean) {
  await requireEditor();
  await db.update(children).set({ active }).where(eq(children.id, id));
  revalidatePath("/ninos");
  revalidatePath("/agenda");
  revalidatePath("/asistencia");
  revalidatePath("/pagos");
}
