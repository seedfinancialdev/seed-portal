import { defineConfig } from "drizzle-kit";

// Allow fallbacks for database URL to support Doppler/Supabase setups
const DB_URL = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("Missing database URL. Set DATABASE_URL or SUPABASE_DB_URL or DIRECT_URL.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DB_URL,
  },
});
