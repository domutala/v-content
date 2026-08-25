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

export function queryCollection<
  K extends keyof ResolvedCollections & string,
  TCollection extends ResolvedCollections[K],
>(name: K): CollectionQuery<TCollection> {
  return new CollectionQueryImpl(name);
}
