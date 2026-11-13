import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const userRoles = ["admin", "assistant", "therapist"] as const;
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
  /** Monthly fee in cents (minor units). */
  monthlyFeeCents: integer("monthly_fee_cents").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull(),
    receiptNumber: text("receipt_number").notNull(),
    payerName: text("payer_name").notNull(),
    paidAt: text("paid_at").notNull(),
    markedBy: text("marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("payment_child_month").on(table.childId, table.yearMonth),
  ],
);

export const foundationSettings = sqliteTable("foundation_settings", {
  id: integer("id").primaryKey().default(1),
  foundationName: text("foundation_name").notNull().default("Fundación"),
  cycleStartDate: text("cycle_start_date").notNull(),
  /** JSON array of weekdays 1–5, e.g. "[1,2,3]" */
  activeWeekdays: text("active_weekdays").notNull().default("[1,2,3]"),
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
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  child: one(children, {
    fields: [payments.childId],
    references: [children.id],
  }),
  marker: one(users, {
    fields: [payments.markedBy],
    references: [users.id],
  }),
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
