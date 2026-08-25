import type { TocItem } from "remark-flexible-toc";
import type { Plugin as UnifiedPlugin } from "unified";
import type { Node } from "unist";

declare module "unist" {
  export interface Node {
    children?: Node[];
  }
}

declare module "vfile" {
  export interface DataMap {
    toc: PageTocItem[];
  }
}

export type PageTocItem = TocItem;

export type PageMeta<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  title: string;
  description?: string;
  icon?: string;
} & T;

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

/**
 * A configured unified plugin. The tree type intentionally remains open:
 * remark plugins consume mdast roots while rehype plugins consume hast roots.
 */
export type PluginTuple = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin: UnifiedPlugin<any[], any, any>,
  options?: Record<string, unknown>,
];
