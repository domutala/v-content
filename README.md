# v-content

> Markdown/YAML/JSON content management for Vue 3. Inspired by Nuxt Content, framework-agnostic, built on `unified` and SQLite.

[![npm version][npm-version-src]][npm-version-href]
[![License][license-src]][license-href]

[npm-version-src]: https://img.shields.io/npm/v/v-content/latest.svg
[npm-version-href]: https://npmjs.com/package/v-content
[license-src]: https://img.shields.io/npm/l/v-content.svg
[license-href]: https://npmjs.com/package/v-content

## Overview

`v-content` is a content management layer for Vue 3 applications that parses Markdown, YAML, and JSON files into typed, queryable collections. It is designed to replicate the core developer experience of Nuxt Content without requiring Nuxt or Nitro.

The library is built on top of:

- [`unified`](https://unifiedjs.com/) / [`remark`](https://remark.js.org/) / [`rehype`](https://github.com/rehypejs/rehype) for Markdown processing
- [`remark-mdc`](https://github.com/nuxtlabs/remark-mdc) for Vue component syntax inside Markdown
- [`fast-glob`](https://github.com/mrmlnc/fast-glob) for file discovery
- SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Node.js) or [`@sqlite.org/sqlite-wasm`](https://sqlite.org/wasm/doc/trunk/index.md) (browser Web Worker)
- [`unplugin`](https://github.com/unjs/unplugin) for universal bundler integration

## Features

- **Typed collections** — Define `page` (Markdown) and `data` (YAML/JSON) collections with TypeScript inference
- **MDC (Markdown Components)** — Embed Vue components inside Markdown with props and named slots
- **Chainable Query API** — SQL-backed queries via `queryCollection().path().first()`
- **Auto-generated navigation** — Nested navigation trees derived from filesystem structure
- **Isomorphic SQLite** — Server-side via `better-sqlite3`, client-side via SQLite WASM in a Web Worker
- **Universal bundler support** — Vite, Rollup, Webpack, esbuild, Rspack, Farm, Bun, Unloader via `unplugin`
- **Auto-generated types** — `.d.ts` files generated at build time from collection definitions

## Installation

```bash
npm install v-content
# or
pnpm add v-content
# or
yarn add v-content
```

**Peer dependency (optional):** `better-sqlite3` is required for SSR/Node.js environments. It is not needed for pure client-side builds.

```bash
npm install -D better-sqlite3
```

## Quick Start

### 1. Configure the plugin

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

### 2. Create content files

```md
---
title: Quick Start
description: First steps with v-content
---

# Welcome

v-content lets you manage Markdown content in Vue 3.

::alert{type="info"}
You can use **Vue components** inside Markdown via MDC syntax.
::
```

### 3. Query and render

```vue
<script setup lang="ts">
const doc = await queryCollection("docs").path("/docs/quick-start").first();
const nav = await queryCollection("docs").navigation();

// Adjacent pages are included automatically (null at either end).
console.log(doc?.previous?.path, doc?.next?.path);
</script>

<template>
	<aside>
		<NavTree :items="nav" />
	</aside>
	<article v-if="doc">
		<h1>{{ doc.meta.title }}</h1>
		<MDC :value="doc.html" />
	</article>
</template>
```

## Architecture

### Build-time pipeline

```
┌─────────────────┐       ┌──────────────┐       ┌─────────────────┐
│  MD / YAML      │─────▶│ MDC Pipeline │─────▶│   HTML + Meta   │
│  / JSON files   │       │ (unified)    │       │   + TOC         │
└─────────────────┘       └──────────────┘       └─────────────────┘
                                                      │
                             ┌────────────────────────┘
                             ▼
                      ┌──────────────┐
                      │  Compress    │
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
         │  SSR / Node   │           │   Browser   │
         │better-sqlite3 │           │SQLite WASM  │
         └───────────────┘           │  (Worker)   │
                                     └─────────────┘
```

At build time, the plugin:

1. **Discovers files** via `fast-glob` using the `source` patterns defined in each collection
2. **Parses Markdown** through the `unified` ecosystem:
   - `remark-parse` → `remark-mdc` → `remark-gfm` → `remark-emoji` → `remark-flexible-toc` → `remark-rehype`
   - `rehype-raw` → `rehype-slug` → `rehype-minify-whitespace` → `rehype-external-links` → `rehype-stringify`
3. **Extracts frontmatter** and validates data against optional `schema` functions
4. **Compresses** the resolved entries into a JSON payload written to `.content/compressed.json`
5. **Generates types** — `content.d.ts` (auto-imports) and `collections.d.ts` (collection type maps)

### Runtime database layer

At runtime, `queryCollection()` initializes a SQLite database:

- **Server / Node.js:** Uses `better-sqlite3` with a local `.content.db` file
- **Browser:** Loads `@sqlite.org/sqlite-wasm` inside a Web Worker (`src/database/sqlite.worker.ts`), seeds it from the `virtual:v-content/compressed` module, and executes queries via a message-passing proxy (`src/database/client.worker.ts`)

The database schema is minimal:

```sql
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  meta_or_data TEXT NOT NULL,
  toc TEXT,
  html TEXT,
  UNIQUE(collection, path)
);
```

### Rendering pipeline

The `<MDC>` component parses the pre-rendered HTML string into a `hast` AST via `src/mdc/parse-html.ts`. `<MDCRenderer>` then recursively traverses the AST and emits Vue VNodes:

- Native HTML tags are rendered as-is
- Custom tags (detected by presence of a hyphen, per `remark-mdc` conventions) are resolved against the Vue component registry in PascalCase
- Named slots (serialized as `<template slot="name">` by `remark-mdc`) are mapped to Vue named slots

## API Reference

### `defineCollection(definition)`

Defines a content collection.

```ts
function defineCollection<T>(definition: T): T;

interface CollectionDefinition {
	type: "page" | "data";
	source: string | CollectionSource | (string | CollectionSource)[];
	schema?: SchemaValidator;
}

interface CollectionSource {
	include: string;
	exclude?: string | string[];
	prefix?: string;
	cwd?: string;
}

type SchemaValidator = <T>(data: unknown, filePath: string) => T;
```

| Property         | Type                                  | Description                                                                                     |
| ---------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `type`           | `"page" \| "data"`                    | `"page"` for Markdown (produces HTML + meta); `"data"` for YAML/JSON (produces structured data) |
| `source`         | `string \| CollectionSource \| array` | File glob(s) defining the collection scope                                                      |
| `source.include` | `string`                              | Glob pattern of files to include                                                                |
| `source.exclude` | `string \| string[]`                  | Patterns to exclude                                                                             |
| `source.prefix`  | `string`                              | Path prefix prepended to the generated URL/path                                                 |
| `source.cwd`     | `string`                              | Working directory relative to the content root                                                  |
| `schema`         | `(data, filePath) => T`               | Optional runtime validation / transformation function                                           |

### `queryCollection(name)`

Returns a `CollectionQuery` instance for the given collection name.

```ts
interface CollectionQuery<T> {
	path(path: string): CollectionQuery<T>;
	order(direction?: "ASC" | "DESC"): CollectionQuery<T>;
	limit(n: number): CollectionQuery<T>;
	all(): Promise<T[]>;
	first(): Promise<T | undefined>;
	navigation(): Promise<NavigationItem[]>;
}

interface ResolvedPageEntry<TMeta extends PageMeta = PageMeta> {
	// ...type, path, meta, toc and html
	previous: PageSibling<TMeta> | null;
	next: PageSibling<TMeta> | null;
}

interface PageSibling<TMeta extends PageMeta = PageMeta> {
	type: "page";
	path: string;
	meta: TMeta;
	toc: PageTocItem[];
}

interface NavigationItem {
	title: string;
	path: string;
	children?: NavigationItem[];
}
```

The `navigation()` method ignores any active filters and returns a nested tree built from all `page` entries in the collection, sorted by path ascending.

### Vue Components

#### `<MDC>`

```vue
<script setup lang="ts">
import type { ResolvedPageEntry } from "v-content";

const props = defineProps<{
	entry: ResolvedPageEntry;
}>();
</script>

<template>
	<MDC :value="entry.html" />
</template>
```

Parses the HTML string into a `hast` AST and renders it via `<MDCRenderer>`.

#### `<MDCRenderer>`

Recursive renderer that converts `hast` nodes into Vue VNodes. Handles:

- Text nodes
- Native HTML elements
- Custom Vue components (kebab-case tags mapped to PascalCase registry lookups)
- Named slots (`<template slot="name">` → Vue named slots)

## Bundler Integration

The plugin is implemented as an `unplugin`, exposed via framework-specific submodules:

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

Each submodule re-exports the same underlying plugin configured for the respective bundler's hook system.

## Comparison with Nuxt Content

| Dimension              | v-content                                              | Nuxt Content                                        |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **Framework coupling** | Vue 3 only (any setup)                                 | Nuxt only                                           |
| **Bundler support**    | 8+ via `unplugin`                                      | Nuxt / Nitro only                                   |
| **Build tool**         | `tsdown` + `unplugin`                                  | Nuxt kit + Nitro                                    |
| **Markdown engine**    | `unified` + `remark-mdc`                               | `unified` + `remark-mdc`                            |
| **Query backend**      | SQLite (`better-sqlite3` / WASM)                       | In-memory JSON / Nitro storage                      |
| **Query API surface**  | `path`, `order`, `limit`, `all`, `first`, `navigation` | Richer (full-text search, `$contains`, `$in`, etc.) |
| **MDC components**     | ✅ Full support                                        | ✅ Full support                                     |
| **Auto-navigation**    | ✅ Zero-config                                         | ✅ Zero-config                                      |
| **Full-text search**   | Not implemented                                        | ✅ Built-in                                         |
| **Content sources**    | Local filesystem only                                  | Local + remote (GitHub, etc.)                       |
| **Nuxt Studio**        | ❌                                                     | ✅                                                  |
| **SSR database**       | Optional `better-sqlite3`                              | First-class via Nitro                               |
| **Client database**    | SQLite WASM in Web Worker                              | JSON payload                                        |
| **Type generation**    | `unimport` + manual `.d.ts`                            | Nuxt schema + types                                 |
| **Bundle size**        | Tree-shakeable, minimal runtime                        | Tied to Nuxt ecosystem                              |

**When to use v-content:**

- You are building a Vue 3 application outside the Nuxt ecosystem (Vite, Rollup, Webpack, etc.)
- You want a decoupled content layer with minimal framework overhead
- You need deep bundler flexibility or are working in a non-standard build pipeline
- You prefer a relational query backend (SQLite) for large content collections

**When to use Nuxt Content:**

- You are already committed to Nuxt and Nitro
- You require built-in full-text search, remote content sources, or Nuxt Studio integration
- You want the most feature-complete, zero-config content solution within the Nuxt ecosystem

## Development

```bash
# Install dependencies
pnpm install

# Run the playground (Vite + Vue 3)
pnpm playground

# Build the library
pnpm build
```

The project uses `pnpm` workspaces. The `playground/` directory contains a working Vite example demonstrating collections, queries, and MDC rendering.

## License

[MIT](./LICENSE)
