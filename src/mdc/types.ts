import { TocItem } from "remark-flexible-toc";

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
