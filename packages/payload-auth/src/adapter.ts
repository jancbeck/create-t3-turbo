import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { BasePayload } from "payload";

import type { Customer } from "@acme/payload/types";

import { isWithinExpirationDate } from "./utils/isWithinExpirationDate";

declare module "@auth/core/adapters" {
  interface AdapterUser extends Customer {}
}

type User = Customer;
type Payload = BasePayload | Promise<BasePayload>;

interface PayloadAdapterOptions {
  collectionNames: {
    users: "customers";
    sessions: "sessions";
  };
  defaultMaxAge?: number;
}

export default function PayloadAdapter(
  payload: Payload,
  options: PayloadAdapterOptions,
): Adapter {
  const userCollectionName = options.collectionNames.users;
  const sessionCollectionName = options.collectionNames.sessions;
  const defaultMaxAge = options.defaultMaxAge ?? 86400;

  const ensureAdapterUser = (user: User): AdapterUser => {
    return {
      ...user,
      email: user.email,
      id: user.id,
      name: user.name,
      image: user.imageUrl,
      emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    };
  };

  return {
    async createUser(data) {
      const userData = {
        ...data,
        emailVerified: data.emailVerified?.toString() ?? null,
        imageUrl: data.image,
      };

      console.log("createUser", data);

      const user = await (
        await payload
      ).create({
        collection: userCollectionName,
        data: userData,
      });
      return ensureAdapterUser(user);
    },

    async getUser(id) {
      const user = (await (
        await payload
      ).findByID({
        collection: userCollectionName,
        id,
      })) as User | null;
      console.log("getUser", user, "id", id);

      return user ? ensureAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const { docs } = await (
        await payload
      ).find({
        collection: userCollectionName,
        where: { email: { equals: email } },
      });
      const user = docs.at(0) ?? null;

      console.log("getUserByEmail", user, "email", email);

      return user ? ensureAdapterUser(user) : null;
    },

    async updateUser(data) {
      const userId = data.id;
      console.log("updateUser", data);
      const { docs } = await (
        await payload
      ).update({
        collection: userCollectionName,
        id: userId,
        // @ts-expect-error what's the correct type here?
        data,
      });
      const user = docs.at(0);
      if (!user) {
        throw new Error("PayloadAdapter: updateUser: no user found");
      }
      return ensureAdapterUser(user);
    },

    async deleteUser(id) {
      console.log("deleteUser", id);

      await (
        await payload
      ).delete({
        collection: userCollectionName,
        id,
      });
    },

    async linkAccount(data) {
      const user = (await (
        await payload
      ).findByID({
        collection: userCollectionName,
        id: data.userId,
      })) as User | null;
      console.log("linkAccount", user, "data", data);

      if (!user) return null;
      const updatedUser = await (
        await payload
      ).update({
        collection: userCollectionName,
        id: data.userId,
        data: {
          accounts: [...(user.accounts ?? []), data],
        },
      });
      console.log("linkAccount -> updatedUser", updatedUser);
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const { docs } = await (
        await payload
      ).find({
        collection: userCollectionName,
        where: {
          "accounts.provider": { equals: provider },
          "accounts.providerAccountId": { equals: providerAccountId },
        },
      });
      const user = docs.at(0) ?? null;
      if (!user || !Array.isArray(user.accounts)) return;
      const updatedAccounts = user.accounts.filter(
        (account) =>
          account.provider !== provider ||
          account.providerAccountId !== providerAccountId,
      );
      await (
        await payload
      ).update({
        collection: userCollectionName,
        id: user.id,
        data: {
          accounts: updatedAccounts,
        },
      });
    },

    async createVerificationToken({ identifier, token, expires }) {
      const { docs } = await (
        await payload
      ).find({
        collection: userCollectionName,
        where: { email: { equals: identifier } },
      });
      const user = docs.at(0);
      console.log(
        "createVerificationToken",
        "identifier",
        identifier,
        "user",
        user,
        "token",
        token,
        "expires",
        expires,
      );

      if (!user) return null;
      await (
        await payload
      ).update({
        collection: userCollectionName,
        id: user.id,
        data: {
          verificationTokens: [
            ...(user.verificationTokens || []),
            { identifier, token, expires: expires.toISOString() },
          ],
        },
      });
      return {
        token,
        expires,
        identifier,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const { docs } = await (
        await payload
      ).find({
        collection: userCollectionName,
        where: {
          "accounts.provider": { equals: provider },
          "accounts.providerAccountId": { equals: providerAccountId },
        },
      });
      const user = docs.at(0) ?? null;

      console.log(
        "getUserByAccount",
        user,
        "providerAccountId",
        providerAccountId,
        "provider",
        provider,
      );

      return user ? ensureAdapterUser(user) : null;
    },

    async createSession({ sessionToken, userId, expires }) {
      console.log("createSession", sessionToken, userId, expires);

      const session = await (
        await payload
      ).create({
        collection: sessionCollectionName,
        data: { sessionToken, user: userId, expires: expires.toISOString() },
      });
      const sessionUserId =
        typeof session.user === "string" ? session.user : session.user.id;
      const sessionExpires = session.expires
        ? new Date(session.expires)
        : new Date(Date.now() + defaultMaxAge);
      return {
        sessionToken: session.sessionToken,
        userId: sessionUserId,
        expires: sessionExpires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const { docs: sessions } = await (
        await payload
      ).find({
        collection: sessionCollectionName,
        depth: 1, // So that we get user object aswell.
        where: { sessionToken: { equals: sessionToken } },
      });
      const session = sessions.at(0);

      if (!session?.user || typeof session.user !== "object") return null;

      const sessionExpires = new Date(session.expires ?? 0);

      if (!isWithinExpirationDate(sessionExpires)) {
        await (
          await payload
        ).delete({
          collection: sessionCollectionName,
          where: { sessionToken: { equals: sessionToken } },
        });
        console.log("Deleted expired session", sessionToken);

        return null;
      }

      return {
        session: {
          sessionToken: session.sessionToken,
          userId:
            typeof session.user === "string" ? session.user : session.user.id,
          expires: new Date(session.expires ?? 0),
        },
        user: ensureAdapterUser(session.user),
      };
    },

    async updateSession({ sessionToken, expires }) {
      const { docs } = await (
        await payload
      ).find({
        collection: sessionCollectionName,
        where: { sessionToken: { equals: sessionToken } },
      });
      console.log("updateSession", sessionToken, expires);

      const session = docs.at(0);
      if (!session || !expires) return null;

      const updatedSession = await (
        await payload
      ).update({
        collection: sessionCollectionName,
        id: session.id,
        data: { expires: expires.toISOString() },
      });
      const sessionUserId =
        typeof updatedSession.user === "string"
          ? updatedSession.user
          : updatedSession.user.id;
      return {
        sessionToken: updatedSession.sessionToken,
        userId: sessionUserId,
        expires: new Date(updatedSession.expires ?? 0),
      };
    },

    async deleteSession(sessionToken) {
      await (
        await payload
      ).delete({
        collection: sessionCollectionName,
        where: { sessionToken: { equals: sessionToken } },
      });
    },
  };
}
