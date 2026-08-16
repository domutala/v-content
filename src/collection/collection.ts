import type { mdc } from "../mdc/index.js";

export type CollectionType = "page" | "data";

/** Fonction de validation : reçoit les données brutes, retourne le type validé (ou throw) */
export type SchemaValidator<T = unknown> = (
  data: unknown,
  filePath: string,
) => T;

export interface CollectionSource {
  include: string;
  exclude?: string | string[];
  prefix?: string;
  cwd?: string;
}

export interface CollectionDefinition<T = unknown> {
  type: CollectionType;
  source: string | CollectionSource | (string | CollectionSource)[];
  schema?: SchemaValidator<T>;
}

export function defineCollection<const T extends CollectionDefinition>(
  definition: T,
): T {
  return definition;
}

export interface ContentConfig<
  TCollections extends Record<string, CollectionDefinition> = Record<
    string,
    CollectionDefinition
  >,
> {
  collections: TCollections;
  root?: string;
  output?: string;
  plugins?: Parameters<typeof mdc>["0"]["plugins"];
}

export type ResolvedContentConfig = Required<ContentConfig> & {
  compresseds: Record<string, string>;
  token: string;
};

export function defineContentConfig<
  TCollections extends Record<string, CollectionDefinition>,
>(config: ContentConfig<TCollections>): ContentConfig<TCollections> {
  return config;
}

export function normalizeSources(
  source: CollectionDefinition["source"],
): CollectionSource[] {
  const list = Array.isArray(source) ? source : [source];
  return list.map((s) => (typeof s === "string" ? { include: s } : s));
}
