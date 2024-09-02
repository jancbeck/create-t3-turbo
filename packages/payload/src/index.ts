import type { Config } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig, getPayload as getPayloadPromise } from "payload";

import { Posts, Users } from "./collections";
import { env } from "./env";

// necessary so that consumers of this package can infer types of the Payload config
export * from "./payload-types";

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
} satisfies Config;

export const config = buildConfig(payloadConfig);

// avoid top-level await for Expo CJS compatibility
export async function getPayload() {
  const payload = await getPayloadPromise({ config });
  return payload;
}

// const payload = await getPayload({ config });
// export default payload;
