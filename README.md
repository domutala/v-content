# v-content

> Markdown/YAML/JSON content management for Vue 3 — inspired by Nuxt Content, compatible with all bundlers.

[![npm version][npm-version-src]][npm-version-href]
[![License][license-src]][license-href]

[npm-version-src]: https://img.shields.io/npm/v/v-content/latest.svg
[npm-version-href]: https://npmjs.com/package/v-content
[license-src]: https://img.shields.io/npm/l/v-content.svg
[license-href]: https://npmjs.com/package/v-content

## ✨ Features

- 📝 **Typed collections** — Define page (Markdown) or data (YAML/JSON) collections via globs
- 🧩 **MDC (Markdown Components)** — Use Vue components directly inside your Markdown files
- 🔍 **Query API** — Query your content with a chainable API (`queryCollection().path().first()`)
- 🗂️ **Auto-generated navigation** — Nested navigation tree built automatically from paths
- 🗃️ **Embedded SQLite** — Lightweight database, server-side (better-sqlite3) or client-side (WASM)
- ⚡ **All bundlers compatible** — Vite, Rollup, Webpack, esbuild, Rspack, Farm, Bun, Unloader
- 🔷 **TypeScript first** — Automatically generated types for your collections

## 📦 Installation

```bash
npm install v-content
# or
pnpm add v-content
# or
yarn add v-content
```

> **Optional peer dependency**: install `better-sqlite3` if you use server-side rendering (SSR).

## 🚀 Quick Start

### 1. Configure the plugin (Vite example)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vContent from "v-content/vite";
import { defineCollection } from "v-content";

export default defineConfig({
	plugins: [
		vue(),
		vContent({
			collections: {
				docs: defineCollection({
					type: "page",
					source: {
						include: "docs/**/*.md",
						exclude: "docs/**/*.draft.md",
					},
				}),
				authors: defineCollection({
					type: "data",
					source: "authors/**/*.yml",
				}),
			},
		}),
	],
});
```

### 2. Create your content

```md
<!-- content/docs/get-started.md -->

---
title: Quick Start
description: First steps with v-content
---

# Welcome

v-content lets you manage Markdown content in Vue 3.

::alert{type="info"}
You can even use **Vue components** inside Markdown!
::
```

### 3. Query and render in your components

```vue
<script setup lang="ts">
const doc = await queryCollection("docs").path("/docs/get-started").first();
</script>

<template>
	<article v-if="doc">
		<h1>{{ doc.meta.title }}</h1>
		<MDC :value="doc.html" />
	</article>
</template>
```

## 📚 API

### `defineCollection(definition)`

Defines a content collection.

```ts
defineCollection({
	type: "page", // or "data"
	source: "docs/**/*.md", // string, object, or array
	schema: (data, filePath) => validatedData, // optional — validation/schema
});
```

**`source` options:**

| Property  | Type                 | Description                          |
| --------- | -------------------- | ------------------------------------ |
| `include` | `string`             | Glob pattern of files to include     |
| `exclude` | `string \| string[]` | Patterns to exclude                  |
| `prefix`  | `string`             | Path prefix added to URLs            |
| `cwd`     | `string`             | Working directory relative to `root` |

### `queryCollection(name)`

Returns a chainable query builder.

```ts
const docs = await queryCollection("docs")
	.path("/docs/get-started") // filter by exact path
	.order("DESC") // sort ("ASC" by default)
	.limit(10) // limit results
	.all(); // or .first() for a single result

// Nested navigation
const nav = await queryCollection("docs").navigation();
```

### Vue Components

#### `<MDC>`

Renders the HTML of a `page` collection entry.

```vue
<MDC :value="entry.html" />
```

#### `<MDCRenderer>`

Internal recursive renderer. Transforms the `hast` AST into Vue VNodes with support for custom components and named slots.

## 🔌 Supported Bundlers

Import the plugin from the corresponding submodule:

| Bundler  | Import                                      |
| -------- | ------------------------------------------- |
| Vite     | `import vContent from "v-content/vite"`     |
| Rollup   | `import vContent from "v-content/rollup"`   |
| Webpack  | `import vContent from "v-content/webpack"`  |
| esbuild  | `import vContent from "v-content/esbuild"`  |
| Rspack   | `import vContent from "v-content/rspack"`   |
| Farm     | `import vContent from "v-content/farm"`     |
| Bun      | `import vContent from "v-content/bun"`      |
| Unloader | `import vContent from "v-content/unloader"` |

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  MD Files       │────▶│ MDC Pipeline │────▶│   HTML + Meta   │
│  YAML / JSON    │      │ (unified)    │      │   + TOC         │
└─────────────────┘      └──────────────┘      └─────────────────┘
                                                    │
                           ┌────────────────────────┘
                           ▼
                    ┌──────────────┐
                    │ Compression  │
                    │  (JSON)      │
                    └──────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  virtual:v-content/    │
              │      compressed        │
              └────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌───────────────┐           ┌─────────────┐
       │  SSR/Node     │           │   Client    │
       │better-sqlite3 │           │SQLite WASM  │
       └───────────────┘           │  (Worker)   │
                                   └─────────────┘
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run the playground
pnpm playground

# Build
pnpm build
```

## 📄 License

[MIT](./LICENSE.md)
