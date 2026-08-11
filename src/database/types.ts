// db/types.ts
import type { BindableValue } from "@sqlite.org/sqlite-wasm";
import { Statement } from "db0";
// ^ type exporté par la lib, réutilisable des deux côtés

// SqlParam couvre les valeurs qu'on utilisera réellement (JS natif),
// tout en restant compatible avec BindableValue côté browser.
export type SqlParam = string | number | bigint | boolean | null | Uint8Array;

export interface Database<TParams = SqlParam> {
  get<T = unknown>(sql: string, params?: TParams[]): Promise<T | undefined>;
  all<T = unknown>(sql: string, params?: TParams[]): Promise<T[]>;
  exec(sql: string, params?: TParams[]): Promise<void>;
  close(): Promise<void>;
}
