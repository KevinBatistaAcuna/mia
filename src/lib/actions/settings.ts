"use server";

import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { foundationSettings, userRoles, users, type UserRole } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { parseActiveWeekdays, WEEKDAYS } from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type AppSettings = {
  id: number;
  foundationName: string;
  cycleStartDate: string;
  activeWeekdays: number[];
};

export async function getSettings(): Promise<AppSettings | null> {
  await requireUser();
  const [settings] = await db.select().from(foundationSettings).limit(1);
  if (!settings) return null;
  return {
    id: settings.id,
    foundationName: settings.foundationName,
    cycleStartDate: settings.cycleStartDate,
    activeWeekdays: parseActiveWeekdays(settings.activeWeekdays),
  };
}

export async function updateSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const foundationName = String(formData.get("foundationName") ?? "").trim();
  const cycleStartDate = String(formData.get("cycleStartDate") ?? "").trim();
  const activeWeekdays = [
    ...new Set(
      formData
        .getAll("activeWeekdays")
        .map(Number)
        .filter((day) => WEEKDAYS.includes(day as (typeof WEEKDAYS)[number])),
    ),
  ].sort((a, b) => a - b);

  if (!foundationName || !cycleStartDate) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (activeWeekdays.length === 0) {
    return {
      ok: false,
      error: "Selecciona al menos un día de atención.",
    };
  }

  await db
    .update(foundationSettings)
    .set({
      foundationName,
      cycleStartDate,
      activeWeekdays: JSON.stringify(activeWeekdays),
    })
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

export async function updateUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!id || !name || !email) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (!userRoles.includes(role)) {
    return { ok: false, error: "Rol inválido." };
  }
  if (password && password.length < 6) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Usuario no encontrado." };

  if (existing.role === "admin" && role !== "admin") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      return {
        ok: false,
        error: "Debe quedar al menos una administradora.",
      };
    }
  }

  try {
    await db
      .update(users)
      .set({
        name,
        email,
        role,
        ...(password
          ? { passwordHash: await bcrypt.hash(password, 10) }
          : {}),
      })
      .where(eq(users.id, id));
  } catch {
    return { ok: false, error: "Ese correo ya está registrado." };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!userId) return { ok: false, error: "Usuario inválido." };
  if (userId === admin.id) {
    return { ok: false, error: "No puedes eliminar tu propio usuario." };
  }

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return { ok: false, error: "Usuario no encontrado." };

  if (target.role === "admin") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      return {
        ok: false,
        error: "Debe quedar al menos una administradora.",
      };
    }
  }

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/configuracion");
  return { ok: true };
}
