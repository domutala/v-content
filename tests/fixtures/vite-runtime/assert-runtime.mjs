import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = new URL("./dist/assets/", import.meta.url);
const files = (await readdir(assetsDir)).filter((file) => file.endsWith(".js"));

if (files.length < 2) {
  throw new Error("Expected Vite to emit a separate dynamically imported chunk");
}

const output = (
  await Promise.all(
    files.map((file) => readFile(join(assetsDir.pathname, file), "utf8")),
  )
).join("\n");

for (const forbidden of ["extend/index.js", 'from"extend"', "rehype-parse"]) {
  if (output.includes(forbidden)) {
    throw new Error(`Browser output unexpectedly contains ${forbidden}`);
  }
}
