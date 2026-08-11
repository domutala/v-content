# Contributing to v-content

Thank you for your interest in `v-content`! This document describes the conventions, development workflow, and best practices for contributing to the project.

## Prerequisites

- **Node.js** `>= 20.0.0`
- **pnpm** `>= 11.0.0` (mandatory package manager — the repo uses pnpm workspaces)
- **Git**

## Environment Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/v-content.git
cd v-content

# 2. Install dependencies
pnpm install

# 3. Verify everything compiles
pnpm build

# 4. Run the playground for testing
pnpm playground
```

The playground is a Vite + Vue 3 application located in `playground/`. It consumes the plugin source code directly (`../src`) and serves as a sandbox for validating changes.

## Monorepo Structure

```
v-content/
├── src/                    # Library source code
│   ├── collection/         # Collection definitions, query builder, compression
│   ├── components/         # Vue components (<MDC>, <MDCRenderer>)
│   ├── database/           # SQLite layer (server + client WASM + worker)
│   ├── mdc/                # Unified pipeline (remark → rehype)
│   ├── plugin/             # Unplugin (bundlers)
│   ├── types/              # Virtual and generated types
│   └── utils/              # Utilities (atomic-write-file, dir, etc.)
├── playground/             # Demo / test application
├── package.json            # Main manifest (type: module)
├── tsconfig.json           # Root TypeScript configuration
├── tsdown.config.ts        # Bundler configuration (tsdown)
└── eslint.config.ts        # ESLint configuration (flat config)
```

## Code Conventions

### TypeScript

- The project is **100 % TypeScript** (`"strict": true` implicitly via `@tsconfig/node24`).
- No `any` except with explicit justification in a comment.
- Public types must be exported from `src/index.ts` or the appropriate entry points.
- Prefer explicit types over ambiguous inference on public APIs.

### Style

- ESLint flat config (`eslint.config.ts`) — run `pnpm eslint` before every commit.
- No mandatory semicolons (project convention).
- Indentation: 2 spaces.
- File names: `kebab-case.ts` for modules, `PascalCase.vue` for components.

### Commits

Follow the atomic, descriptive commit convention:

```
feat(collection): add Zod schema support
fix(database): fix race condition on WASM seed
docs(readme): update Vite example
refactor(mdc): replace rehype-slug with internal plugin
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/my-fix
```

### 2. Develop and Test

#### Modifying the MDC Pipeline

If you touch `src/mdc/mdc.ts` (remark/rehype plugins):

1. Modify the pipeline
2. Add or update a Markdown file in `playground/content/docs/`
3. Run `pnpm playground` and verify rendering in the browser
4. Verify that the generated HTML is correct (inspect the DOM, check slugs, TOC, etc.)

#### Modifying the Database Layer

If you touch `src/database/`:

1. **Server side**: test with `better-sqlite3` installed. The playground in dev mode uses the Node.js filesystem.
2. **Client side**: verify that the WASM Worker loads correctly (Network tab → `sqlite3.wasm`, console without `OpfsDb` error).
3. Test the query `queryCollection("docs").all()` in the playground to validate seeding and reading.

#### Modifying the Bundler Plugin

If you touch `src/plugin/` or the submodules `src/plugin/bundlers/`:

1. The plugin is based on `unplugin` — single logic, 8 entry points.
2. Test at minimum with **Vite** (`pnpm playground`) and, if possible, with another bundler (Rollup or Webpack).
3. Verify that the virtual module `virtual:v-content/compressed` resolves correctly.
4. Verify that the `queryCollection` auto-import works (no TypeScript error in the playground).

#### Modifying Vue Components

If you touch `src/components/MDC.vue` or `MDCRenderer.vue`:

1. Test rendering with custom MDC components (`::MyComponent{prop="val"}`)
2. Test named slots (`#default`, `#header`, etc.)
3. Verify reactivity (changing `value` on `<MDC>`)

### 3. Build

```bash
pnpm build
```

The build uses `tsdown` to compile `src/` to `dist/` as ESM + CJS + types. No compilation errors should remain.

### 4. Lint

```bash
pnpm eslint
```

### 5. Open a Pull Request

1. Push your branch to your fork
2. Open a PR to `main` with:
   - A clear title following the commit convention
   - A description explaining **the problem solved** or **the feature added**
   - Test instructions if necessary
   - Screenshots or logs for visual / runtime bugs

## Best Practices by Domain

### Markdown Pipeline (MDC)

- `remark` plugins manipulate the Markdown AST (mdast).
- `rehype` plugins manipulate the HTML AST (hast).
- The plugin order in `src/mdc/mdc.ts` is intentional and sensitive. Only modify it with good reason and tests.
- `remark-mdc` transforms `::Component{prop}` into custom HTML elements. `rehype-raw` is necessary to preserve raw HTML before rehype conversion.

### Database

- The SQLite schema is intentionally minimal (single `entries` table).
- The `meta_or_data` column is polymorphic: JSON string containing either `meta` (page) or `data` (data).
- The client-side seed uses `ON CONFLICT ... DO UPDATE` to support HMR (re-seed without unique constraint error).
- The WASM worker (`sqlite.worker.ts`) communicates via `postMessage`. Keep messages typed (`src/database/types.ts`).

### Unplugin

- The plugin exposes two internal hooks:
  1. `v-content` — resolution of the virtual module `virtual:v-content/compressed` + type generation
  2. `v-content:auto-import` — import injection via `unimport`
- The `enforce: "pre"` option on the first hook ensures types are generated before the bundler resolves imports.
- The `enforce: "post"` option on the second hook ensures import injection happens after other plugins' transformations (Vue, etc.).

### Compression

- Collections are compressed to JSON via `src/collection/compressor.ts`.
- The format is a serialized entry array. Keep the structure stable to avoid breaking client-side decompression.

## Reporting a Bug

Before opening an issue:

1. Check that the bug is not already reported
2. Provide a **minimal reproduction** (ideally a playground branch or a minimal repo)
3. Include:
   - The `v-content` version
   - The Node.js and pnpm versions
   - The bundler used
   - The full error message (stack trace)
   - The problematic content file (if applicable)

## Questions and Discussions

For usage questions, feature proposals, or architecture discussions, prefer **GitHub Discussions** over issues.

---

Thank you for your contribution! 🚀
