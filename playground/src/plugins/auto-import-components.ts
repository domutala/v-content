import { writeFileSync } from "fs";
import { basename, dirname, relative, resolve } from "path";

import { createUnplugin } from "unplugin";
import fg from "fast-glob";

import { injectComponents, type ScannedComponent } from "./transform.js";

const VIRTUAL_ID = "virtual:auto-components";
const RESOLVED_VIRTUAL_ID = "\0" + VIRTUAL_ID;

type ComponentDir = { dir: string; prefix?: string };

interface Options {
  dirs?: string | ComponentDir | (string | ComponentDir)[];
  dts?: boolean | string;
}

export default createUnplugin<Options>((options = {}) => {
  options.dirs ??= [];
  options.dirs = Array.isArray(options.dirs) ? options.dirs : [options.dirs];
  options.dts ??= true;

  let components: ScannedComponent[] = [];

  const dirs = options.dirs.map((dir) => {
    return typeof dir === "string" ? { dir } : dir;
  });

  function scanAll() {
    components = [];
    for (const dir of dirs) scan(dir);
  }

  function scan(dir: ComponentDir) {
    const files = fg.sync("**/*.vue", {
      onlyFiles: true,
      absolute: true,
      cwd: dir.dir,
    });

    components.push(
      ...files.map((file) => {
        let name = basename(file).replace(".vue", "");
        if (dir.prefix) name = `${dir.prefix}${name}`;

        return { name: name, file };
      }),
    );
  }

  function generatedDts() {
    if (!options.dts) return;

    const outFile = options.dts === true ? ".ui/components.d.ts" : options.dts;

    const lines = components.map((component) => {
      const rPath = relative(dirname(outFile), component.file);
      return `${component.name}: typeof import('${rPath}')['default'];`;
    });

    const content = `
declare module 'vue' {
  export interface GlobalComponents {
    ${lines.join("\n    ")}
  }
}

export {}
    `;

    writeFileSync(resolve(process.cwd(), outFile), content);
  }

  function rebuild() {
    scanAll();
    generatedDts();
  }

  const shouldRescan = (path: string) =>
    dirs.some((d) => resolve(path).startsWith(resolve(d.dir))) &&
    path.endsWith(".vue");

  return [
    {
      name: "v-component-autoimport",
      enforce: "pre",

      buildStart() {
        rebuild();

        for (const component of components) {
          this.addWatchFile(component.file);
        }
      },

      watchChange(id) {
        if (shouldRescan(id)) rebuild();
      },
    },

    {
      name: "v-component-autoimport:transform",
      enforce: "post",

      transform(code, id) {
        // On ne cible que le code JS compilé issu des .vue (le bloc <script>+<template>)
        if (!id.endsWith(".vue") && !id.includes(".vue?vue&type=")) return;
        if (id.includes("node_modules")) return;

        return injectComponents(code, id, components);
      },
    },

    {
      name: "v-component-autoimport:virtual",

      resolveId(id: string) {
        if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      },

      load(id: string) {
        if (id !== RESOLVED_VIRTUAL_ID) return;

        const imports = components
          .map((c, i) => `import __c${i} from ${JSON.stringify(c.file)}`)
          .join("\n");

        const registrations = components
          .map((c, i) => `  app.component(${JSON.stringify(c.name)}, __c${i})`)
          .join("\n");

        return `
${imports}

export default {
  install(app) {
${registrations}
  }
}
`;
      },
    },
  ];
});
