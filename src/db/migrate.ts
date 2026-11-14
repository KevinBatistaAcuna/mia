import { sql } from "drizzle-orm";
import { db } from "./index";

async function tableHasColumn(table: string, column: string) {
  const result = await db.$client.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => String(row.name) === column);
}

async function migrate() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  if (!(await tableHasColumn("children", "monthly_fee_cents"))) {
    await db.run(
      sql`ALTER TABLE children ADD COLUMN monthly_fee_cents INTEGER NOT NULL DEFAULT 0`,
    );
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS foundation_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      foundation_name TEXT NOT NULL DEFAULT 'Fundación',
      cycle_start_date TEXT NOT NULL,
      active_weekdays TEXT NOT NULL DEFAULT '[1,2,3]'
    )
  `);

  if (!(await tableHasColumn("foundation_settings", "active_weekdays"))) {
    await db.run(
      sql`ALTER TABLE foundation_settings ADD COLUMN active_weekdays TEXT NOT NULL DEFAULT '[1,2,3]'`,
    );
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS schedule_slots (
      id TEXT PRIMARY KEY NOT NULL,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      specialty TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      time TEXT NOT NULL,
      week_cycle TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS slot_unique
    ON schedule_slots (specialty, weekday, time, week_cycle)
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      slot_id TEXT REFERENCES schedule_slots(id) ON DELETE SET NULL,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      specialty TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_day_slot
    ON attendance_records (date, slot_id)
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      year_month TEXT NOT NULL,
      amount_paid_cents INTEGER NOT NULL,
      receipt_number TEXT NOT NULL,
      payer_name TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      marked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_child_month
    ON payments (child_id, year_month)
  `);

  console.log("Migración completa");
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
