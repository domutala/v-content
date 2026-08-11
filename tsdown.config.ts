import path from "node:path";
import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
  entry: [
    "./src/**/*.{js,jsx,ts,tsx,vue}",
    "!./src/**/*.test.{js,jsx,ts,tsx}",
    "!./src/**/*.spec.{js,jsx,ts,tsx}",
  ],

  tsconfig: "./tsconfig.build.json",
  format: ["esm"],
  sourcemap: false,
  clean: true,
  unbundle: true,
  globImport: false,

  dts: { vue: true },

  alias: {
    "@/*": path.resolve(import.meta.dirname, "src"),
  },

  plugins: [Vue({ isProduction: true })],

  deps: {
    neverBundle: (id) => {
      if (id.startsWith("@/")) return false;
      if (id.startsWith("virtual:")) return true;

      return /^[^./]/.test(id);
    },
  },

  outExtensions: (ctx) => {
    return {
      js: ctx.format === "cjs" ? ".cjs" : ".js",
    };
  },
});
