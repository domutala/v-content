import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

import vContent from "../src/plugin/bundlers/vite.js";
import { defineCollection, type Plugin } from "../src/index.js";
import Components from "./src/plugins/auto-import-components.js";
import { resolve } from "node:path";
import { Element, Text } from "hast";
import { visit } from "unist-util-visit";

import { rehypeTable, rehypeList } from "../src/mdc/plugins/index.js";

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

const rehypeLink: Plugin = function () {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;

      node.tagName = "u-prose-link";
    });
  };
};

const rehypeCode: Plugin = function () {
  function getText(node: Element): string {
    if (!node.children) return "";
    return node.children
      .map((child) => {
        if (child.type === "text") return child.value;
        if (child.type === "element") return getText(child as Element);
        return "";
      })
      .join("");
  }

  return (tree) => {
    visit(tree, "element", (node: Element, index, parent?: Element) => {
      if (node.tagName !== "code") return;

      const isBlock = parent?.type === "element" && parent.tagName === "pre";
      if (isBlock) return;
      node.tagName = "u-prose-code";
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
      plugins: [
        [rehypeUCode],
        [rehypeLink],
        [rehypeCode],
        [rehypeTable, { extractData: true, componentName: "u-use-table" }],
        [rehypeList, { extractData: true, componentName: "u-prose-list" }],
      ],

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
