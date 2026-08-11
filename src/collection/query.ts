import type {
  ResolvedCollections,
  ResolvedDataEntry,
  ResolvedPageEntry,
} from "./resolve.js";
import { createDb } from "../database/index.js";
import type { Database, SqlParam } from "../database/types.js";

interface EntryRow {
  type: "page" | "data";
  path: string;
  meta_or_data: string;
  toc: string | null;
  html: string | null;
}

function rowToEntry<T>(row: EntryRow): T {
  if (row.type === "page") {
    return {
      type: "page",
      path: row.path,
      meta: JSON.parse(row.meta_or_data) as T,
      toc: row.toc ? JSON.parse(row.toc) : undefined,
      html: row.html ?? "",
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
  children?: NavigationItem[];
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
function buildNavigationTree(
  entries: ResolvedPageEntry<{ title?: string }>[],
): NavigationItem[] {
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
        node = { title: titleFromSegment(segment), path: currentPath };
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
}

interface QueryState {
  path?: string;
  order: "ASC" | "DESC";
  limit?: number;
}

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
    const sql = `SELECT type, path, meta_or_data, toc, html
         FROM entries
         WHERE collection = ? AND type = 'page'
         ORDER BY path ASC`;

    const rows = await db.all<EntryRow>(sql, [this.collection]);

    const entries = rows.map((row) =>
      rowToEntry<{ title?: string }>(row),
    ) as ResolvedPageEntry<{ title?: string }>[];

    return buildNavigationTree(entries);
  }

  private build(forcedLimit?: number): { sql: string; params: SqlParam[] } {
    const params: SqlParam[] = [this.collection];
    let sql = `SELECT type, path, meta_or_data, toc, html FROM entries WHERE collection = ?`;

    if (this.state.path !== undefined) {
      sql += ` AND path = ?`;
      params.push(this.state.path);
    }

    sql += ` ORDER BY path ${this.state.order}`;

    const limit = forcedLimit ?? this.state.limit;
    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    return { sql, params };
  }
}

export function queryCollection<
  K extends keyof ResolvedCollections & string,
  TCollection extends ResolvedCollections[K],
>(name: K): CollectionQuery<TCollection> {
  return new CollectionQueryImpl(name) as any;
}
