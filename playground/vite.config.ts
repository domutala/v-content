import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

import vContent from "../src/plugin/bundlers/vite";
import { defineCollection } from "../src";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    vContent({
      collections: {
        docs: defineCollection({
          type: "page",
          source: {
            include: "docs/**/*.md",
            exclude: "docs/**/*.draft.md",
            // prefix: "/docs",
          },
          // schema: docSchema,
        }),

        authors: defineCollection({
          type: "data",
          source: "authors/**/*.yml",
          // pas de schema => data typée `unknown`
        }),
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
