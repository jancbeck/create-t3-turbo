import path from "path";
import { fileURLToPath } from "url";
import type { Config } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";

import { Posts, Users } from "./collections";
import { env } from "./env";

// necessary so that consumers of this package can infer types of the Payload config
export * from "./payload-types";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadConfig = {
  cors: "*",
  admin: {
    user: Users.slug,
  },
  collections: [Users, Posts],
  secret: env.PAYLOAD_SECRET,
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URI,
    },
  }),
  plugins: [
    // storage-adapter-placeholder
  ],
  typescript: {
    autoGenerate: env.NODE_ENV === "development",
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
} satisfies Config;

const config = buildConfig(payloadConfig);
export default config;
