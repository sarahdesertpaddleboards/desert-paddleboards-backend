import type { Config } from "drizzle-kit";

export default {
  dialect: "mysql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "mysql://root:XcsNyUgkDfgMFmXsaMolMEQJOibWTxIY@crossover.proxy.rlwy.net:24535/railway"
  }
} satisfies Config;
