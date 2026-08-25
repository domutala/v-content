import type { Database } from "./types.js";

export async function createClientDb(
  filename = "content.db",
): Promise<Database> {
  const { default: sqlite3InitModule } =
    await import("@sqlite.org/sqlite-wasm");

  Object.assign(globalThis, {
    sqlite3ApiConfig: {
      // overriding default log function allows to avoid error when logger are dropped in build.
      // For example `nuxt-security` module drops logger in production build by default.
      silent: true,
      debug: (...args: unknown[]) => console.debug(...args),
      warn: (...args: unknown[]) => {
        if (String(args[0]).includes("OPFS sqlite3_vfs")) {
          return;
        }
        console.warn(...args);
      },
      error: (...args: unknown[]) => console.error(...args),
      log: (...args: unknown[]) => console.log(...args),
    },
  });

  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(filename);

  const database: Database = {
    async get(sql, params = []) {
      const row = db
        .exec({
          sql,
          bind: params,
          rowMode: "object",
          returnValue: "resultRows",
        })
        .shift();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return row as any;
    },

    async all(sql, params = []) {
      const rows = db.exec({
        sql,
        bind: params,
        rowMode: "object",
        returnValue: "resultRows",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows as any;
    },

    async exec(sql, params = []) {
      await db.exec({ sql, bind: params });
    },

    async close() {
      db.close();
    },
  };

  return database;
}
