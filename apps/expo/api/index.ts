import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequestHandler } from "@expo/server/adapter/vercel.js";

export default createRequestHandler({
  build: join(dirname(fileURLToPath(import.meta.url)), "../dist/server"),
});
