import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { htmlToText } from "v-content";

const plainText = htmlToText(`
  <article data-search-leak="attribute-token">
    <h1>Visible title</h1>
    <script>script-token</script>
    <style>.style-token { color: red }</style>
    <p>Hello <strong>world</strong><br>next line</p>
  </article>
`);

for (const visible of ["Visible title", "Hello world", "next line"]) {
  if (!plainText.includes(visible)) {
    throw new Error(`Plain text is missing visible content: ${visible}`);
  }
}

for (const hidden of [
  "article",
  "data-search-leak",
  "attribute-token",
  "script-token",
  "style-token",
  "strong",
]) {
  if (plainText.includes(hidden)) {
    throw new Error(`Plain text unexpectedly contains markup: ${hidden}`);
  }
}

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
