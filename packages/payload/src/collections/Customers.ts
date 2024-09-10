import type { CollectionConfig } from "payload";

export const Customers: CollectionConfig = {
  slug: "customers",
  admin: {
    useAsTitle: "email",
  },
  fields: [
    { name: "name", type: "text" },
    { name: "imageUrl", type: "text" },
    {
      name: "email",
      type: "email",
      unique: true,
      required: true,
      index: true,
    },
    { name: "emailVerified", type: "date" },
    {
      name: "accounts",
      type: "array",
      saveToJWT: false,
      fields: [
        {
          type: "row",
          fields: [
            { name: "provider", type: "text", admin: { readOnly: true } },
            {
              name: "providerAccountId",
              type: "text",
              admin: { readOnly: true },
            },
          ],
        },
      ],
    },
    {
      name: "verificationTokens",
      type: "array",
      saveToJWT: false,
      fields: [
        {
          type: "row",
          fields: [
            { name: "identifier", type: "text", admin: { readOnly: true } },
            { name: "token", type: "text", admin: { readOnly: true } },
            { name: "expires", type: "date", admin: { readOnly: true } },
          ],
        },
      ],
    },
  ],
};
