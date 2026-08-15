import { TocItem } from "remark-flexible-toc";
import type { Plugin as UPlugin } from "unified";

declare module "unist" {
  export interface Node {
    children?: Node[];
  }
}

declare module "vfile" {
  export interface DataMap {
    toc: TocItem;
  }
}

export type Plugin = UPlugin<Array<{ root?: string; maxDepth: number }>>;
