import { join, relative, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import { createUnplugin } from "unplugin";
import { createUnimport } from "unimport";
import chokidar, { type FSWatcher } from "chokidar";
import { minimatch } from "minimatch";

import {
  CollectionSource,
  ContentConfig,
  normalizeSources,
  type ResolvedContentConfig,
} from "../collection/index.js";
import { normalizeDir } from "../utils/dir.js";
import { initContent } from "../init.js";

const COMPRESSED_MODULE_ID = "virtual:v-content/compressed";
const RESOLVED_COMPRESSED_MODULE_ID = "\0" + COMPRESSED_MODULE_ID;

export default createUnplugin<ContentConfig | undefined>((config) => {
  let _config: ResolvedContentConfig;
  let sources: CollectionSource[];
  let watchers: FSWatcher[] = [];

  const unimport = createUnimport({
    imports: [
      {
        name: "queryCollection",
        from: resolve(import.meta.dirname, "../collection/query.js"),
      },
    ],
  });

  async function resolveSources() {
    _config = await initContent(config);

    sources = Object.values(_config.collections)
      .map((collection) => normalizeSources(collection.source))
      .flat();
  }

  // Watch bas-niveau, indépendant du bundler. Ferme les watchers
  // précédents si on rappelle startWatch (utile en cas de re-init).
  function startWatch(onChange: (path: string) => void) {
    stopWatch();

    sources.forEach((source) => {
      const cwd = source.cwd ? join(_config.root, source.cwd) : _config.root;

      const exclude = source.exclude
        ? Array.isArray(source.exclude)
          ? source.exclude
          : [source.exclude]
        : [];

      const watcher = chokidar
        .watch(cwd, {
          ignoreInitial: true,
          ignored: (file, stats) => {
            if (!stats) return false;
            if (!stats.isFile()) return false;
            const relativePath = relative(cwd, file);
            const isInclude = minimatch(relativePath, source.include);
            if (!isInclude) return true;
            return exclude.some((pattern) => minimatch(relativePath, pattern));
          },
        })
        .on("change", async (path) => {
          await resolveSources();
          onChange(path);
        })
        .on("unlink", async (path) => {
          await resolveSources();
          onChange(path);
        })
        .on("add", async (path) => {
          await resolveSources();
          onChange(path);
        });

      watchers.push(watcher);
    });
  }

  function stopWatch() {
    watchers.forEach((w) => w.close());
    watchers = [];
  }

  return [
    // --- Plugin coeur : résolution du contenu, module virtuel, .d.ts ---
    {
      name: "v-content",
      enforce: "pre",

      async buildStart() {
        if (!_config) await resolveSources();

        const dts = await unimport.generateTypeDeclarations({
          resolvePath: (r) => normalizeDir(relative(_config.output, r.from)),
        });

        writeFileSync(resolve(_config.output!, "content.d.ts"), dts, "utf-8");
      },

      resolveId(id) {
        if (id === COMPRESSED_MODULE_ID) return RESOLVED_COMPRESSED_MODULE_ID;
      },

      load(id) {
        if (id === RESOLVED_COMPRESSED_MODULE_ID) {
          const code = readFileSync(
            resolve(_config.output, "compressed.json"),
            "utf-8",
          );
          return `export default ${code}`;
        }
      },
    },

    // --- Auto-import (inchangé, universel via unimport) ---
    {
      name: "v-content:auto-import",
      enforce: "post",

      async transform(code, id) {
        if (id.includes("node_modules") || id.startsWith("\0")) return;

        const result = await unimport.injectImports(code, id);
        if (!result.s.hasChanged()) return;

        return {
          code: result.s.toString(),
          map: result.s.generateMap({ hires: true }),
        };
      },
    },

    // --- Watch + reload, spécifique par bundler ---
    {
      name: "v-content:watch",
      enforce: "pre",

      // Vite : websocket HMR natif
      vite: {
        async configureServer(server) {
          await resolveSources();

          sources.forEach((source) => {
            const cwd = source.cwd
              ? join(_config.root, source.cwd)
              : _config.root;
            server.watcher.unwatch(join(cwd, source.include));
          });

          startWatch(() => {
            // 1. Récupère le module virtuel dans le graphe de Vite
            const mod = server.moduleGraph.getModuleById(
              RESOLVED_COMPRESSED_MODULE_ID,
            );

            if (mod) server.moduleGraph.invalidateModule(mod);

            // 3. Seulement maintenant on prévient le client de recharger
            server.ws.send({
              type: "full-reload",
              path: resolve(_config.output, "compressed.json"),
            });
          });

          server.httpServer?.once("close", stopWatch);
        },
      },

      // Webpack : invalide le watcher interne pour forcer un rebuild,
      // ce qui déclenche ensuite le HMR de webpack-dev-server.
      webpack(compiler) {
        compiler.hooks.watchRun.tapPromise("v-content:watch", async () => {
          if (!_config) await resolveSources();
          if (watchers.length) return;

          startWatch(() => {
            compiler.watching?.invalidate();
          });
        });

        compiler.hooks.watchClose?.tap("v-content:watch", stopWatch);
      },

      // Rspack : API quasi identique à webpack
      rspack(compiler) {
        compiler.hooks.watchRun.tapPromise("v-content:watch", async () => {
          if (!_config) await resolveSources();
          if (watchers.length) return;

          startWatch(() => {
            compiler.watching?.invalidate();
          });
        });

        compiler.hooks.watchClose?.tap("v-content:watch", stopWatch);
      },

      // Rollup : pas de "serveur", on s'appuie sur addWatchFile +
      // le hook watchChange universel plutôt que sur chokidar manuel.
      rollup: {
        async buildStart() {
          if (!_config) await resolveSources();

          sources.forEach((source) => {
            const cwd = source.cwd
              ? join(_config.root, source.cwd)
              : _config.root;
            this.addWatchFile(cwd);
          });
        },
        async watchChange() {
          await resolveSources();
          // Rollup relance buildStart/load automatiquement sur watchChange,
          // donc pas besoin d'appeler manuellement un reload ici.
        },
      },

      // Rolldown : même API que Rollup
      rolldown: {
        async buildStart() {
          if (!_config) await resolveSources();

          sources.forEach((source) => {
            const cwd = source.cwd
              ? join(_config.root, source.cwd)
              : _config.root;
            this.addWatchFile(cwd);
          });
        },
        async watchChange() {
          await resolveSources();
        },
      },

      // Farm : suit les hooks universels quand disponibles
      farm: {
        watchChange: async () => {
          await resolveSources();
        },
      },
    },
  ];
});
