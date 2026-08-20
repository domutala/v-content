import { renameSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function atomicWriteFile(path: string, content: string): void {
  const temporaryPath = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;

  mkdirSync(dirname(path), { recursive: true });

  try {
    writeFileSync(temporaryPath, content);
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}
