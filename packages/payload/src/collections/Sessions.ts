import type { CollectionConfig } from "payload";

export const Sessions: CollectionConfig = {
  slug: "sessions",
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "customers",
      required: true,
      admin: { readOnly: false },
    },
    {
      name: "sessionToken",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: false },
    },
    {
      name: "expires",
      type: "date",
      admin: { readOnly: false, date: { pickerAppearance: "dayAndTime" } },
      required: false,
    },
  ],
} as const;
