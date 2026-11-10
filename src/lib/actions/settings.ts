"use server";

import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { foundationSettings, userRoles, users, type UserRole } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getSettings() {
  await requireUser();
  const [settings] = await db.select().from(foundationSettings).limit(1);
  return settings;
}

export async function updateSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const foundationName = String(formData.get("foundationName") ?? "").trim();
  const cycleStartDate = String(formData.get("cycleStartDate") ?? "").trim();

  if (!foundationName || !cycleStartDate) {
    return { ok: false, error: "Completa todos los campos." };
  }

  await db
    .update(foundationSettings)
    .set({ foundationName, cycleStartDate })
    .where(eq(foundationSettings.id, 1));

  revalidatePath("/configuracion");
  revalidatePath("/asistencia");
  revalidatePath("/agenda");
  revalidatePath("/reportes");
  return { ok: true };
}

export async function listUsers() {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function createUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!name || !email || !password) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (!userRoles.includes(role)) {
    return { ok: false, error: "Rol inválido." };
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    await db.insert(users).values({
      id: createId(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
    });
  } catch {
    return { ok: false, error: "Ese correo ya está registrado." };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
