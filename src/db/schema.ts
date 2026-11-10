import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const userRoles = ["admin", "assistant"] as const;
export type UserRole = (typeof userRoles)[number];

export const specialties = ["fisica", "lenguaje", "ocupacional"] as const;
export type Specialty = (typeof specialties)[number];

export const weekCycles = ["A", "B"] as const;
export type WeekCycle = (typeof weekCycles)[number];

export const attendanceStatuses = [
  "presente",
  "ausente_justificado",
  "ausente_injustificado",
  "tardia",
  "cancelacion_fundacion",
] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const children = sqliteTable("children", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const foundationSettings = sqliteTable("foundation_settings", {
  id: integer("id").primaryKey().default(1),
  foundationName: text("foundation_name").notNull().default("Fundación"),
  cycleStartDate: text("cycle_start_date").notNull(),
});

export const scheduleSlots = sqliteTable(
  "schedule_slots",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    specialty: text("specialty", { enum: specialties }).notNull(),
    weekday: integer("weekday").notNull(),
    time: text("time").notNull(),
    weekCycle: text("week_cycle", { enum: weekCycles }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("slot_unique").on(
      table.specialty,
      table.weekday,
      table.time,
      table.weekCycle,
    ),
  ],
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    slotId: text("slot_id").references(() => scheduleSlots.id, {
      onDelete: "set null",
    }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    specialty: text("specialty", { enum: specialties }).notNull(),
    time: text("time").notNull(),
    status: text("status", { enum: attendanceStatuses }).notNull(),
    markedBy: text("marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("attendance_day_slot").on(table.date, table.slotId),
  ],
);

export const childrenRelations = relations(children, ({ many }) => ({
  slots: many(scheduleSlots),
  attendance: many(attendanceRecords),
}));

export const scheduleSlotsRelations = relations(scheduleSlots, ({ one }) => ({
  child: one(children, {
    fields: [scheduleSlots.childId],
    references: [children.id],
  }),
}));

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  child: one(children, {
    fields: [attendanceRecords.childId],
    references: [children.id],
  }),
  slot: one(scheduleSlots, {
    fields: [attendanceRecords.slotId],
    references: [scheduleSlots.id],
  }),
  marker: one(users, {
    fields: [attendanceRecords.markedBy],
    references: [users.id],
  }),
}));
