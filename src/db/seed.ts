import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { foundationSettings, users } from "./schema";
import { createId } from "../lib/id";
import { todayLocal } from "../lib/cycle";

async function seed() {
  const adminEmail = "admin@mia.local";
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: createId(),
      email: adminEmail,
      name: "Administradora",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "admin",
    });
    console.log("Usuario admin creado: admin@mia.local / admin123");
  } else {
    console.log("Usuario admin ya existe");
  }

  const settings = await db.select().from(foundationSettings).limit(1);
  if (settings.length === 0) {
    await db.insert(foundationSettings).values({
      id: 1,
      foundationName: "MIA Fundación",
      cycleStartDate: todayLocal(),
      activeWeekdays: "[1,2,3]",
    });
    console.log("Configuración inicial creada");
  } else {
    console.log("Configuración ya existe");
  }
}

seed()
  .then(() => {
    console.log("Seed completo");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
