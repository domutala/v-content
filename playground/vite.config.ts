import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

import vContent from "../src/plugin/bundlers/vite.js";
import { defineCollection, type Plugin } from "../src/index.js";
import Components from "./src/plugins/auto-import-components.js";
import { resolve } from "node:path";
import { Element } from "hast";
import { visit } from "unist-util-visit";

const rehypeUCode: Plugin = function () {
  return (tree) => {
    visit(tree, "element", (node: Element, index: number, parent: Element) => {
      if (node.tagName !== "pre" || !parent || index == null) return;
      if (parent.tagName === "u-code") return;
      if (parent.tagName === "u-code-group") return;

      parent.children[index] = {
        type: "element",
        tagName: "u-code",
        properties: {},
        children: [node],
      };
    });
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),

    tailwindcss(),

    vContent({
      plugins: [rehypeUCode],
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

    Components.vite({
      dirs: [
        { dir: "src/components/ui", prefix: "U" },
        { dir: "src/components/globals", prefix: "U" },
        resolve(import.meta.dirname, "../src/components"),
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
