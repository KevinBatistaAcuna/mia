import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/mia.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken,
  },
});
