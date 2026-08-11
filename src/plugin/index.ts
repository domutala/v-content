import { relative, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import { createUnplugin } from "unplugin";
import { createUnimport } from "unimport";

import type { ContentConfig } from "../collection";
import { normalizeDir } from "../utils/dir";

const COMPRESSED_MODULE_ID = "virtual:v-content/compressed";
const RESOLVED_COMPRESSED_MODULE_ID = "\0" + COMPRESSED_MODULE_ID;

export default createUnplugin<ContentConfig>((config) => {
  const unimport = createUnimport({
    imports: [
      {
        name: "queryCollection",
        from: resolve(import.meta.dirname, "../collection/query.js"),
      },
    ],
  });

  return [
    {
      name: "v-content",
      enforce: "pre",

      async buildStart() {
        const dts = await unimport.generateTypeDeclarations({
          resolvePath: (r) => {
            return normalizeDir(relative(config.output!, r.from));
          },
        });

        writeFileSync(resolve(config.output!, "content.d.ts"), dts, "utf-8");
      },

      resolveId(id) {
        if (id === COMPRESSED_MODULE_ID) return RESOLVED_COMPRESSED_MODULE_ID;
      },

      load(id) {
        if (id === RESOLVED_COMPRESSED_MODULE_ID) {
          if (!config?.output) {
            throw new Error("[v-content] config.output is not defined");
          }

          const code = readFileSync(
            resolve(config.output, "compressed.json"),
            "utf-8",
          );

          return `export default ${code}`;
        }
      },
    },

    {
      name: "v-content:auto-import",
      enforce: "post",

      async transform(code, id) {
        // Évite de traiter node_modules, le module virtuel lui-même, etc.
        if (id.includes("node_modules") || id.startsWith("\0")) return;

        const result = await unimport.injectImports(code, id);

        if (!result.s.hasChanged()) return;

        return {
          code: result.s.toString(),
          map: result.s.generateMap({ hires: true }),
        };
      },
    },
  ];
});
