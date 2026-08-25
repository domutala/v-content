import type {
  ResolvedCollections,
  ResolvedDataEntry,
  ResolvedPageEntry,
} from "./resolve.js";
import { createDb } from "../database/sqlite/index.js";
import type { Database, SqlParam } from "../database/sqlite/types.js";
import type { PageMeta } from "../mdc/types.js";

interface EntryRow {
  type: "page" | "data";
  path: string;
  meta_or_data: string;
  toc: string | null;
  html: string | null;
  previous_path: string | null;
  previous_meta: string | null;
  previous_toc: string | null;
  next_path: string | null;
  next_meta: string | null;
  next_toc: string | null;
}

function rowToEntry<T>(row: EntryRow): T {
  if (row.type === "page") {
    return {
      type: "page",
      path: row.path,
      meta: JSON.parse(row.meta_or_data) as T,
      toc: row.toc ? JSON.parse(row.toc) : undefined,
      html: row.html ?? "",
      previous:
        row.previous_path && row.previous_meta
          ? {
              type: "page",
              path: row.previous_path,
              meta: JSON.parse(row.previous_meta),
              toc: row.previous_toc ? JSON.parse(row.previous_toc) : [],
            }
          : null,
      next:
        row.next_path && row.next_meta
          ? {
              type: "page",
              path: row.next_path,
              meta: JSON.parse(row.next_meta),
              toc: row.next_toc ? JSON.parse(row.next_toc) : [],
            }
          : null,
    } as T;
  }

  return {
    type: "data",
    path: row.path,
    data: JSON.parse(row.meta_or_data) as T,
  } as T;
}

export interface NavigationItem {
  title: string;
  path: string;
  meta: PageMeta;
  description?: string;
  children?: NavigationItem[];
}

export interface SearchOptions {
  /** Interpret the query as plain words (default) or as FTS5 syntax. */
  mode?: "plain" | "fts5";
  /** BM25 weights. Higher values make matches in the field more important. */
  weights?: Partial<Record<"title" | "description" | "content", number>>;
  /** Number of content tokens included in the highlighted excerpt. */
  excerptLength?: number;
}

export interface SearchResult<
  TMeta extends PageMeta = PageMeta,
  TCollection extends string = string,
> {
  collection: TCollection;
  path: string;
  meta: TMeta;
  /** Positive relevance score: higher is better. */
  score: number;
  /** Content excerpt with matches wrapped in <mark>. */
  excerpt: string;
}

interface SearchRow {
  collection: string;
  path: string;
  meta_or_data: string;
  score: number;
  excerpt: string | null;
}

function titleFromSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds a nested navigation tree from page paths. An `index.md` file
 * resolves to its parent directory's path, so it naturally becomes the
 * folder node (its title overrides the placeholder derived from the
 * segment name).
 */
function buildNavigationTree(entries: ResolvedPageEntry[]): NavigationItem[] {
  const root: NavigationItem[] = [];
  const nodesByPath = new Map<string, NavigationItem>();

  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean);
    let currentPath = "";
    let siblings = root;

    segments.forEach((segment, index) => {
      currentPath += "/" + segment;
      const isLeaf = index === segments.length - 1;

      let node = nodesByPath.get(currentPath);

      if (!node) {
        node = {
          description: entry.meta.description,
          title: titleFromSegment(segment),
          path: currentPath,
          meta: entry.meta,
        };
        nodesByPath.set(currentPath, node);
        siblings.push(node);
      }

      if (isLeaf) {
        node.title = entry.meta.title ?? node.title;
      } else {
        node.children ??= [];
      }

      siblings = node.children ?? siblings;
    });
  }

  return root;
}

/** Chainable query builder, à la `queryCollection` de Nuxt Content */
export interface CollectionQuery<
  T extends ResolvedPageEntry | ResolvedDataEntry,
> {
  /** Filter on an exact path (e.g. "/docs/get-started") */
  path(path: string): CollectionQuery<T>;
  /** Sort by path (ASC by default) */
  order(direction?: "ASC" | "DESC"): CollectionQuery<T>;
  limit(n: number): CollectionQuery<T>;

  /** Run the query, return every matching entry */
  all(): Promise<T[]>;
  /** Run the query, return the first matching entry (or undefined) */
  first(): Promise<T | undefined>;

  /** Nested navigation tree for this collection (empty for "data" collections) */
  navigation(): Promise<NavigationItem[]>;

  /** Full-text search across page titles, descriptions, and rendered content. */
  search(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult<T extends ResolvedPageEntry<infer M> ? M : PageMeta>[]>;
}

interface QueryState {
  path?: string;
  order: "ASC" | "DESC";
  limit?: number;
}

type EntryPageMeta<T> = T extends ResolvedPageEntry<infer M> ? M : PageMeta;

export class CollectionQueryImpl<
  T extends ResolvedPageEntry | ResolvedDataEntry,
> implements CollectionQuery<T> {
  private state: QueryState = { order: "ASC" };
  private db: Promise<Database<SqlParam>>;
  private collection: string;

  constructor(collection: string) {
    this.collection = collection;
    this.db = createDb(collection);
  }

  path(path: string): this {
    this.state.path = path;
    return this;
  }

  order(direction: "ASC" | "DESC" = "ASC"): this {
    this.state.order = direction;
    return this;
  }

  limit(n: number): this {
    this.state.limit = n;
    return this;
  }

  async all() {
    const db = await this.db;
    const { sql, params } = this.build();
    const rows = await db.all<EntryRow>(sql, params);
    // return row ? rowToEntry<T>(row) : undefined;

    return rows.map((row) => rowToEntry<T>(row));
  }

  async first(): Promise<T | undefined> {
    const db = await this.db;
    const { sql, params } = this.build(1);
    const row = await db.get<EntryRow>(sql, params);

    return row ? rowToEntry<T>(row) : undefined;
  }

  async navigation(): Promise<NavigationItem[]> {
    // always walks the full, unfiltered collection (ignores any
    // .path()/.limit() already set), sorted ASC so parents are always
    // encountered before their children in a single pass
    const db = await this.db;
    const sql = `SELECT type, path, meta_or_data, toc, html,
                NULL AS previous_path, NULL AS previous_meta,
                NULL AS previous_toc, NULL AS next_path,
                NULL AS next_meta, NULL AS next_toc
         FROM entries
         WHERE collection = ? AND type = 'page'
         ORDER BY path ASC`;

    const rows = await db.all<EntryRow>(sql, [this.collection]);

    const entries = rows.map((row) =>
      rowToEntry<{ title?: string }>(row),
    ) as ResolvedPageEntry[];

    return buildNavigationTree(entries);
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<EntryPageMeta<T>>[]> {
    return executeSearch<string, EntryPageMeta<T>>(
      this.db,
      [this.collection],
      query,
      options,
      this.state.limit,
    );
  }

  private build(forcedLimit?: number): { sql: string; params: SqlParam[] } {
    const params: SqlParam[] = [this.collection];
    let sql = `SELECT e.type, e.path, e.meta_or_data, e.toc, e.html,
      (SELECT p.path FROM entries p
       WHERE p.collection = e.collection AND p.type = 'page' AND p.path < e.path
       ORDER BY p.path DESC LIMIT 1) AS previous_path,
      (SELECT p.meta_or_data FROM entries p
       WHERE p.collection = e.collection AND p.type = 'page' AND p.path < e.path
       ORDER BY p.path DESC LIMIT 1) AS previous_meta,
      (SELECT p.toc FROM entries p
       WHERE p.collection = e.collection AND p.type = 'page' AND p.path < e.path
       ORDER BY p.path DESC LIMIT 1) AS previous_toc,
      (SELECT n.path FROM entries n
       WHERE n.collection = e.collection AND n.type = 'page' AND n.path > e.path
       ORDER BY n.path ASC LIMIT 1) AS next_path,
      (SELECT n.meta_or_data FROM entries n
       WHERE n.collection = e.collection AND n.type = 'page' AND n.path > e.path
       ORDER BY n.path ASC LIMIT 1) AS next_meta,
      (SELECT n.toc FROM entries n
       WHERE n.collection = e.collection AND n.type = 'page' AND n.path > e.path
       ORDER BY n.path ASC LIMIT 1) AS next_toc
      FROM entries e WHERE e.collection = ?`;

    if (this.state.path !== undefined) {
      sql += ` AND e.path = ?`;
      params.push(this.state.path);
    }

    sql += ` ORDER BY e.path ${this.state.order}`;

    const limit = forcedLimit ?? this.state.limit;
    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    return { sql, params };
  }
}

export interface MultiCollectionSearchQuery<
  TCollection extends keyof ResolvedCollections & string,
> {
  limit(n: number): MultiCollectionSearchQuery<TCollection>;
  search(
    query: string,
    options?: SearchOptions,
  ): Promise<
    SearchResult<
      ResolvedCollections[TCollection] extends ResolvedPageEntry<infer M>
        ? M
        : PageMeta,
      TCollection
    >[]
  >;
}

type CollectionPageMeta<TCollection extends keyof ResolvedCollections> =
  ResolvedCollections[TCollection] extends ResolvedPageEntry<infer M>
    ? M
    : PageMeta;

class MultiCollectionSearchQueryImpl<
  TCollection extends keyof ResolvedCollections & string,
> implements MultiCollectionSearchQuery<TCollection> {
  private readonly db: Promise<Database<SqlParam>>;
  private resultLimit?: number;

  constructor(private readonly collections: readonly TCollection[]) {
    if (collections.length === 0) {
      throw new Error("queryCollections() requires at least one collection");
    }
    this.db = seedCollections(collections);
  }

  limit(n: number): this {
    this.resultLimit = n;
    return this;
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<CollectionPageMeta<TCollection>, TCollection>[]> {
    return executeSearch<TCollection, CollectionPageMeta<TCollection>>(
      this.db,
      this.collections,
      query,
      options,
      this.resultLimit,
    );
  }
}

async function seedCollections(
  collections: readonly string[],
): Promise<Database<SqlParam>> {
  let db: Database<SqlParam> | undefined;
  for (const collection of collections) db = await createDb(collection);
  return db!;
}

async function executeSearch<
  TCollection extends string = string,
  TMeta extends PageMeta = PageMeta,
>(
  dbPromise: Promise<Database<SqlParam>>,
  collections: readonly string[],
  query: string,
  options: SearchOptions,
  requestedLimit?: number,
) {
  const match =
    options.mode === "fts5" ? query.trim() : buildPlainSearchQuery(query);
  if (!match) return [];

  const db = await dbPromise;
  const weights = {
    title: options.weights?.title ?? 10,
    description: options.weights?.description ?? 5,
    content: options.weights?.content ?? 1,
  };
  const excerptLength = Math.max(1, Math.trunc(options.excerptLength ?? 24));
  const limit = requestedLimit ?? 20;
  const collectionPlaceholders = collections.map(() => "?").join(", ");

  // FTS5 returns lower BM25 values for better matches (usually negative),
  // so negate the value exposed by the public API.
  const rows = await db.all<SearchRow>(
    `SELECT entries_fts.collection, e.path, e.meta_or_data,
            -bm25(entries_fts, 0.0, 0.0, ?, ?, ?) AS score,
            snippet(entries_fts, -1, '<mark>', '</mark>', ' … ', ?) AS excerpt
     FROM entries_fts
     JOIN entries e
       ON e.collection = entries_fts.collection
      AND e.path = entries_fts.path
     WHERE entries_fts MATCH ?
       AND entries_fts.collection IN (${collectionPlaceholders})
     ORDER BY bm25(entries_fts, 0.0, 0.0, ?, ?, ?) ASC,
              entries_fts.collection ASC, e.path ASC
     LIMIT ?`,
    [
      weights.title,
      weights.description,
      weights.content,
      excerptLength,
      match,
      ...collections,
      weights.title,
      weights.description,
      weights.content,
      limit,
    ],
  );

  return rows.map((row): SearchResult<TMeta, TCollection> => ({
    collection: row.collection as TCollection,
    path: row.path,
    meta: JSON.parse(row.meta_or_data) as TMeta,
    score: row.score,
    excerpt: row.excerpt ?? "",
  }));
}

function buildPlainSearchQuery(query: string): string {
  return query
    .normalize("NFKC")
    .match(/[\p{L}\p{N}_-]+/gu)
    ?.map((term) => `"${term.replaceAll('"', '""')}"*`)
    .join(" AND ") ?? "";
}

export function queryCollection<
  K extends keyof ResolvedCollections & string,
  TCollection extends ResolvedCollections[K],
>(name: K): CollectionQuery<TCollection> {
  return new CollectionQueryImpl(name);
}

export function queryCollections<
  K extends keyof ResolvedCollections & string,
>(names: readonly K[]): MultiCollectionSearchQuery<K> {
  return new MultiCollectionSearchQueryImpl(names);
}
