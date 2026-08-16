import { TocItem } from "remark-flexible-toc";
import type { Plugin as UnifiedPlugin } from "unified";
import { Node } from "unist";

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

export type PropertiesTableProps = {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

declare module "hast" {
  export interface Properties {
    tableProps?: PropertiesTableProps;
  }
}

export type Plugin<
  T extends object = object,
  Input extends Node = Node,
> = UnifiedPlugin<Array<{ root?: string; maxDepth: number } & T>, Input>;
