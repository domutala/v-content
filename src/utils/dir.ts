import { isAbsolute } from "node:path";

export function normalizeDir(dir: string) {
  if (!isAbsolute(dir) && !dir.startsWith("..") && !dir.startsWith("./")) {
    dir = `./${dir.replace(/\\/g, "/")}`;
  }
  return dir;
}

export function normalizeDirs<T extends object>(dirs: T) {
  function _forEach(datas: any) {
    if (Array.isArray(datas)) {
      for (let i = 0; i < datas.length; i++) {
        datas[i] = _forEach(datas[i]);
      }
    } else if (Object.prototype.toString.call(datas) === "[object Object]") {
      for (const key in datas) {
        datas[key] = _forEach(datas[key]);
      }
    } else if (typeof datas === "string") {
      datas = normalizeDir(datas);
    }

    return datas;
  }

  return _forEach(dirs) as T;
}
