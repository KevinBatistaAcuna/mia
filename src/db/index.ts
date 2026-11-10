import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbFile = process.env.DATABASE_PATH ?? "mia.db";
const absolutePath = path.isAbsolute(dbFile)
  ? dbFile
  : path.join(/*turbopackIgnore: true*/ process.cwd(), "data", path.basename(dbFile));

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const sqlite = new Database(absolutePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
