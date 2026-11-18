import { sql } from "drizzle-orm";
import { db } from "./index";

async function tableInfo(table: string) {
  const result = await db.$client.execute(`PRAGMA table_info(${table})`);
  return result.rows.map((row) => ({
    name: String(row.name),
    notnull: Number(row.notnull) === 1,
  }));
}

async function tableHasColumn(table: string, column: string) {
  const columns = await tableInfo(table);
  return columns.some((col) => col.name === column);
}

async function columnIsNotNull(table: string, column: string) {
  const columns = await tableInfo(table);
  return columns.find((col) => col.name === column)?.notnull ?? false;
}

/** Rebuild schedule_slots so kind exists and child_id stays nullable. */
async function rebuildScheduleSlotsTable() {
  // attendance_records.slot_id references this table; disable FKs for the swap.
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    await db.run(sql`
      CREATE TABLE schedule_slots_new (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'session',
        specialty TEXT NOT NULL,
        weekday INTEGER NOT NULL,
        time TEXT NOT NULL,
        week_cycle TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `);

    const hasKind = await tableHasColumn("schedule_slots", "kind");
    if (hasKind) {
      await db.run(sql`
        INSERT INTO schedule_slots_new (
          id, child_id, kind, specialty, weekday, time, week_cycle, created_at
        )
        SELECT
          id, child_id, kind, specialty, weekday, time, week_cycle, created_at
        FROM schedule_slots
      `);
    } else {
      await db.run(sql`
        INSERT INTO schedule_slots_new (
          id, child_id, kind, specialty, weekday, time, week_cycle, created_at
        )
        SELECT
          id, child_id, 'session', specialty, weekday, time, week_cycle, created_at
        FROM schedule_slots
      `);
    }

    await db.run(sql`DROP TABLE schedule_slots`);
    await db.run(sql`ALTER TABLE schedule_slots_new RENAME TO schedule_slots`);
  } finally {
    await db.run(sql`PRAGMA foreign_keys = ON`);
  }
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

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS specialties (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  await db.run(sql`
    INSERT OR IGNORE INTO specialties (id, name, short_code, active, sort_order)
    VALUES
      ('fisica', 'Terapia física', 'TF', 1, 1),
      ('lenguaje', 'Terapia de lenguaje', 'TL', 1, 2),
      ('ocupacional', 'Terapia ocupacional', 'TO', 1, 3)
  `);

  if (!(await tableHasColumn("foundation_settings", "active_weekdays"))) {
    await db.run(
      sql`ALTER TABLE foundation_settings ADD COLUMN active_weekdays TEXT NOT NULL DEFAULT '[1,2,3]'`,
    );
  }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS schedule_slots (
      id TEXT PRIMARY KEY NOT NULL,
      child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'session',
      specialty TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      time TEXT NOT NULL,
      week_cycle TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Prod may still have the pre-kind schema. Prefer ADD COLUMN; rebuild if
  // child_id is still NOT NULL (needed for slots tipo contrato sin niño).
  if (!(await tableHasColumn("schedule_slots", "kind"))) {
    try {
      await db.run(
        sql`ALTER TABLE schedule_slots ADD COLUMN kind TEXT NOT NULL DEFAULT 'session'`,
      );
    } catch {
      await rebuildScheduleSlotsTable();
    }
  }

  if (await columnIsNotNull("schedule_slots", "child_id")) {
    await rebuildScheduleSlotsTable();
  }

  // Group sessions may share specialty + day + time + cycle.
  await db.run(sql`DROP INDEX IF EXISTS slot_unique`);

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
