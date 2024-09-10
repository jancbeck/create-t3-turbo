import type {
  DefaultSession,
  NextAuthConfig,
  Session as NextAuthSession,
} from "next-auth";
import { skipCSRFCheck } from "@auth/core";
import Discord from "next-auth/providers/discord";
import { getPayload as getPayloadInstance } from "payload";

import configPromise from "@acme/payload";
import PayloadAdapter from "@acme/payload-auth/adapter";

import { env } from "../env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const payloadAdapterOptions = {
  collectionNames: {
    users: "customers",
    sessions: "sessions",
  },
  defaultMaxAge: 86400,
} as const;

export const isSecureContext = env.NODE_ENV !== "development";

export async function getPayload(): ReturnType<typeof getPayloadInstance> {
  return getPayloadInstance({ config: await configPromise });
}
export const authConfig = () => {
  const payload = getPayload();
  return {
    debug: true,
    adapter: PayloadAdapter(payload, payloadAdapterOptions),
    ...(!isSecureContext
      ? {
          skipCSRFCheck: skipCSRFCheck,
          trustHost: true,
        }
      : {}),
    secret: env.AUTH_SECRET,
    providers: [Discord],
    callbacks: {
      session: (opts) => {
        if (!("user" in opts))
          throw new Error("unreachable with session strategy");
        return {
          ...opts.session,
          user: {
            ...opts.session.user,
            id: opts.user.id,
          },
        };
      },
    },
  } satisfies NextAuthConfig;
};

export const validateToken = async (
  token: string,
): Promise<NextAuthSession | null> => {
  const sessionToken = token.slice("Bearer ".length);
  const payload = getPayload();
  const adapter = PayloadAdapter(payload, payloadAdapterOptions);
  const session = await adapter.getSessionAndUser?.(sessionToken);
  return session
    ? {
        user: {
          ...session.user,
        },
        expires: session.session.expires.toISOString(),
      }
    : null;
};

export const invalidateSessionToken = async (token: string) => {
  const sessionToken = token.slice("Bearer ".length);
  const payload = getPayload();
  const adapter = PayloadAdapter(payload, payloadAdapterOptions);
  await adapter.deleteSession?.(sessionToken);
};
