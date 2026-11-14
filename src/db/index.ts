import { loadEnvConfig } from "@next/env";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

function resolveLocalFileUrl() {
  const dbFile = process.env.DATABASE_PATH ?? "mia.db";
  const absolutePath = path.isAbsolute(dbFile)
    ? dbFile
    : path.join(
        /*turbopackIgnore: true*/ process.cwd(),
        "data",
        path.basename(dbFile),
      );

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  return `file:${absolutePath.replace(/\\/g, "/")}`;
}

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url && (url.startsWith("libsql://") || url.startsWith("https://"))) {
    return createClient({ url, authToken });
  }

  return createClient({
    url: url && url.startsWith("file:") ? url : resolveLocalFileUrl(),
  });
}

const client = createDbClient();

export const db = drizzle(client, { schema });
export type Db = typeof db;
