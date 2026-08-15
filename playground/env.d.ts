/// <reference types="vite/client" />

// src/virtual-auto-components.d.ts
declare module "virtual:auto-components" {
  import type { Plugin } from "vue";

  const plugin: Plugin;
  export default plugin;
}
