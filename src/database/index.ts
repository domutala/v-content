import { decompressCollection } from "../collection/compressor.js";
import { ResolvedEntry } from "../collection/index.js";
import type { Database } from "./types.js";

export interface CreateDbOptions {
  path?: string;
  filename?: string;
}

let dbPromise: Promise<Database> | undefined;
let token: string;
const seeded = new Set();
const seeding = new Map<string, Promise<void>>();

export async function createDb(
  collectionName: string,
  options: CreateDbOptions = {},
): Promise<Database> {
  dbPromise ??= initDb(options);

  let raws: Record<string, string>;
  let _token: string;

  if (typeof window === "undefined") {
    const { config } = await import("../init.js");
    raws = config.compresseds;
    _token = config.token;
  } else {
    const _raws = await import("virtual:v-content/compressed");

    raws = _raws.default.compresseds;
    _token = _raws.default.token;
  }

  if (_token !== token) {
    token = _token;
    seeded.clear();
    seeding.clear();
  }

  await seedCollection(await dbPromise, collectionName, raws);

  return dbPromise;
}

async function initDb({
  path = ".content.db",
  filename = "content.db",
}: CreateDbOptions): Promise<Database> {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";

  let db: Database;

  if (isBrowser) {
    const { createClientDb } = await import("./client.js");
    db = await createClientDb(filename);
  } else {
    const { createServerDb } = await import("./server.js");
    db = createServerDb(path) as Database;
  }

  return db;
}

async function seedCollection(
  db: Database,
  collectionName: string,
  raws: Record<string, string>,
) {
  if (seeded.has(collectionName)) return;

  const pending = seeding.get(collectionName);
  if (pending) return pending;

  const promise = seedCollectionOnce(db, collectionName, raws);
  seeding.set(collectionName, promise);

  try {
    await promise;
    seeded.add(collectionName);
  } finally {
    seeding.delete(collectionName);
  }
}

async function seedCollectionOnce(
  db: Database,
  collectionName: string,
  raws: Record<string, string>,
) {
  const raw = raws[collectionName];
  if (!raw) return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      meta_or_data TEXT NOT NULL,
      toc TEXT,
      html TEXT,
      UNIQUE(collection, path)
    );
  `);

  const entries = await decompressCollection<ResolvedEntry[]>(raw);

  for (const entry of entries) {
    const isPage = entry.type === "page";
    await db.exec(
      // ⚠️ run(), pas exec() — voir remarque ci-dessous
      `INSERT INTO entries (collection, type, path, meta_or_data, toc, html)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(collection, path) DO UPDATE SET
         type = excluded.type,
         meta_or_data = excluded.meta_or_data,
         toc = excluded.toc,
         html = excluded.html`,
      [
        collectionName,
        entry.type,
        entry.path,
        JSON.stringify(isPage ? entry.meta : entry.data),
        isPage ? JSON.stringify(entry.toc ?? null) : null,
        isPage ? (entry.html ?? "") : null,
      ],
    );
  }

}
