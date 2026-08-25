// db/worker/sqlite.worker.ts
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

import type { SqlParam } from "./types.js";

// Le worker est le SEUL endroit qui touche la connexion sqlite —
// c'est ce qui permet à Atomics.wait/OPFS de fonctionner correctement
// (contrairement au thread principal, où ça se bloque silencieusement).
let db: any;

type Method = "run" | "get" | "all" | "exec" | "close";

interface WorkerRequest {
  id: number;
  method: Method;
  sql?: string;
  params?: SqlParam[];
}

type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

function reply(response: WorkerResponse) {
  postMessage(response);
}

async function ensureDb(filename: string) {
  if (db) return db;

  Object.assign(globalThis, {
    sqlite3ApiConfig: {
      // overriding default log function allows to avoid error when logger are dropped in build.
      // For example `nuxt-security` module drops logger in production build by default.
      // silent: true,
      debug: (...args: unknown[]) => console.debug(...args),
      warn: (...args: unknown[]) => {
        // if (String(args[0]).includes("OPFS sqlite3_vfs")) {
        //   return;
        // }
        console.warn(...args);
      },
      error: (...args: unknown[]) => console.error(...args),
      log: (...args: unknown[]) => console.log(...args),
    },
  });

  const sqlite3 = await sqlite3InitModule();
  const hasOpfs = "opfs" in sqlite3;
  console.log("OPFS disponible:", hasOpfs);

  // db = hasOpfs
  //   ? new sqlite3.oo1.OpfsDb(filename)
  //   : new sqlite3.oo1.DB(filename, "c");

  db = new sqlite3.oo1.DB(filename);

  return db;
}

self.onmessage = async (
  event: MessageEvent<WorkerRequest & { filename?: string }>,
) => {
  const { id, method, sql, params = [], filename } = event.data;

  try {
    const database = await ensureDb(filename ?? "content.db");

    switch (method) {
      case "exec": {
        database.exec({ sql: sql!, bind: params });
        console.log("-----::::::::::::::::");
        reply({ id, ok: true, result: undefined });
        break;
      }

      case "get": {
        const rows = database.exec({
          sql: sql!,
          bind: params,
          rowMode: "object",
          returnValue: "resultRows",
        });
        console.log("::::::::::::::::");
        console.log(rows);

        reply({ id, ok: true, result: rows[0] });
        break;
      }

      case "all": {
        const rows = database.exec({
          sql: sql!,
          bind: params,
          rowMode: "object",
          returnValue: "resultRows",
        });
        reply({ id, ok: true, result: rows });
        break;
      }

      case "close": {
        database.close();
        db = undefined;
        reply({ id, ok: true, result: undefined });
        break;
      }
    }
  } catch (err) {
    reply({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
