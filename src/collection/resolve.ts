/* eslint-disable @typescript-eslint/no-empty-object-type */

import { join, extname, relative, sep } from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type {
  CollectionDefinition,
  CollectionSource,
  SchemaValidator,
} from "./collection.js";
import { normalizeSources } from "./collection.js";
import { mdc, PageMeta, PageTocItem } from "../index.js";
import { compressCollection } from "./compressor.js";
import { atomicWriteFile } from "../utils/atomic-write-file.js";
import { normalizeDir } from "../utils/dir.js";

export interface ResolvedPageEntry<TMeta extends PageMeta = PageMeta> {
  type: "page";
  path: string;
  meta: TMeta;
  toc: PageTocItem[];
  html: string;
}

export interface ResolvedDataEntry<TData = unknown> {
  type: "data";
  path: string;
  data: TData;
}

export type ResolvedEntry = ResolvedPageEntry | ResolvedDataEntry;

export interface ResolvedCollections {}

interface ResolveOptions {
  root: string;
  output: string;
}

function applyPrefix(path: string, prefix?: string): string {
  if (!prefix) return path;
  const cleanPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
  return path === "/" ? cleanPrefix : cleanPrefix + path;
}

function validate<T extends PageMeta = PageMeta>(
  schema: SchemaValidator<T> | undefined,
  data: unknown,
  filePath: string,
): T {
  if (!schema) return data as T;

  try {
    return schema(data, filePath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(`Validation échouée pour ${filePath}:\n  ${reason}`, {
      cause: error,
    });
  }
}

export async function collectFiles(
  source: CollectionSource,
  root: string,
): Promise<{ absolutePath: string; cwd: string }[]> {
  const cwd = source.cwd ? join(root, source.cwd) : root;

  const files = await fg(source.include, {
    cwd,
    ignore: source.exclude
      ? Array.isArray(source.exclude)
        ? source.exclude
        : [source.exclude]
      : undefined,
    absolute: false,
    onlyFiles: true,
  });

  return files.map((f) => ({ absolutePath: join(cwd, f), cwd }));
}

async function resolvePageEntry<T extends PageMeta = PageMeta>(
  filePath: string,
  cwd: string,
  source: CollectionSource,
  schema: SchemaValidator<T> | undefined,
  plugins: Parameters<typeof mdc>[0]["plugins"],
): Promise<ResolvedPageEntry<T>> {
  const vfile = await mdc({ file: filePath, root: cwd, plugins });

  const meta = validate(schema, vfile.data.meta, filePath);
  const path = applyPrefix(vfile.data.path!, source.prefix);

  return {
    type: "page",
    path,
    meta,
    toc: vfile.data.toc ?? [],
    html: vfile.toString(),
  };
}

async function resolveDataEntry(
  filePath: string,
  cwd: string,
  source: CollectionSource,
  schema: SchemaValidator | undefined,
): Promise<ResolvedDataEntry> {
  const raw = await readFile(filePath, "utf8");
  const ext = extname(filePath);

  const parsed = ext === ".json" ? JSON.parse(raw) : parseYaml(raw);
  const data = validate(schema, parsed, filePath);

  const relativePath = relative(cwd, filePath);
  const withoutExt = relativePath.slice(0, -ext.length);
  const segments = withoutExt.split(sep).filter(Boolean);

  const path = applyPrefix("/" + segments.join("/"), source.prefix);

  return { type: "data", path, data };
}

export async function resolveCollection(
  definition: CollectionDefinition,
  options: ResolveOptions,
  plugins: Parameters<typeof mdc>[0]["plugins"],
): Promise<(ResolvedPageEntry | ResolvedDataEntry)[]> {
  const sources = normalizeSources(definition.source);
  const entries: (ResolvedPageEntry | ResolvedDataEntry)[] = [];

  for (const source of sources) {
    const files = await collectFiles(source, options.root);

    for (const { absolutePath, cwd } of files) {
      const entry =
        definition.type === "page"
          ? await resolvePageEntry(
              absolutePath,
              cwd,
              source,
              definition.schema,
              plugins,
            )
          : await resolveDataEntry(
              absolutePath,
              cwd,
              source,
              definition.schema,
            );

      entries.push(entry);
    }
  }

  return entries;
}

const dtsCollectionTemplate = `
import type { ResolvedPageEntry, ResolvedDataEntry } from '{{resolve_path}}';

declare module "{{resolve_path}}" {
    interface ResolvedCollections {
{{collection_types}}
    }
}

export {};
`;

export async function resolveContentConfig<
  TCollections extends Record<string, CollectionDefinition>,
>(
  config: {
    collections?: TCollections;
    plugins?: Parameters<typeof mdc>[0]["plugins"];
  },
  options: ResolveOptions,
): Promise<{
  compresseds: Record<string, string>;
  token: string;
  collections: {
    [K in keyof TCollections]: TCollections[K] extends CollectionDefinition
      ? TCollections[K]["type"] extends "page"
        ? ResolvedPageEntry[]
        : ResolvedDataEntry[]
      : never;
  };
}> {
  atomicWriteFile(join(options.output, "compressed.json"), "{}");

  const collections = config.collections ?? ({} as TCollections);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = {} as any;
  const compresseds: Record<string, string> = {};
  const types = [];
  const token = "_content_" + Math.random().toString().slice(2, 50);

  for (const key of Object.keys(collections)) {
    result[key] = await resolveCollection(
      collections[key as keyof TCollections],
      options,
      config.plugins ?? [],
    );

    const compressed = await compressCollection(result[key]);

    compresseds[key] = compressed;

    if (collections[key].type === "page") {
      types.push(`        ${key}: ResolvedPageEntry;`);
    } else {
      types.push(`        ${key}: ResolvedDataEntry;`);
    }
  }

  atomicWriteFile(
    join(options.output, "compressed.json"),
    JSON.stringify(
      {
        compresseds,
        token,
      },
      null,
      4,
    ),
  );

  atomicWriteFile(
    join(options.output, "collections.d.ts"),

    dtsCollectionTemplate
      .replaceAll(
        "{{resolve_path}}",
        normalizeDir(relative(options.output, import.meta.filename)),
      )
      .replaceAll("{{collection_types}}", types.join("\n")),
  );

  return { collections: result, compresseds, token };
}
