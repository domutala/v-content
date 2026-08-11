import { createDatabase, Primitive } from "db0";
import sqlite from "db0/connectors/better-sqlite3";

import type { Database } from "./types.js";

export function createServerDb(path = ".content.db"): Database<Primitive> {
  const db = createDatabase(sqlite({ path }));

  return {
    async get(sql, params = []) {
      return (await db.prepare(sql).get(...params)) as any;
    },

    async all(sql, params = []) {
      return (await db.prepare(sql).all(...params)) as any;
    },

    async exec(sql, params = []) {
      await db.prepare(sql).run(...params);
    },

    async close() {
      // db0 ne fournit pas de close() unifié pour tous les connectors —
      // à vérifier selon la version, certains drivers le gèrent en interne
    },
  };
}
