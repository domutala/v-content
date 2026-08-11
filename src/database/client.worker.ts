// db/client.ts
import type { Database, SqlParam } from "./types.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: unknown) => void;
}

export async function createClientDb(
  filename = "content.db",
): Promise<Database> {
  // import.meta.url : chemin résolu correctement par Vite/Rollup pour
  // bundler le worker comme module séparé (syntaxe attendue par leur
  // plugin worker natif ESM).

  const worker = new Worker(new URL("./sqlite.worker.js", import.meta.url), {
    type: "module",
  });

  const pending = new Map<number, PendingRequest>();
  let nextId = 0;

  worker.onmessage = (event: MessageEvent) => {
    const { id, ok, result, error } = event.data;
    const request = pending.get(id);
    if (!request) return; // réponse orpheline (ne devrait pas arriver)

    pending.delete(id);
    if (ok) request.resolve(result);
    else request.reject(new Error(error));
  };

  worker.onerror = (event) => {
    // erreur au niveau du worker lui-même (ex: échec de chargement du wasm) —
    // on rejette toutes les requêtes en attente pour ne pas les laisser
    // pendre indéfiniment
    for (const [id, request] of pending) {
      request.reject(new Error(event.message));
      pending.delete(id);
    }
  };

  function call<T = unknown>(
    method: "get" | "all" | "exec" | "close",
    sql?: string,
    params?: SqlParam[],
  ): Promise<T> {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, method, sql, params, filename });
    });
  }

  return {
    async exec(sql, params = []) {
      call("exec", sql, params);
    },
    async get(sql, params = []) {
      return call("get", sql, params);
    },
    async all(sql, params = []) {
      return call("all", sql, params);
    },
    async close() {
      await call("close");
      worker.terminate();
    },
  };
}
