import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

import { Plugin } from "../types.js";

export interface RehypeUListOptions {
  /**
   * If `true`, extracts the list's data into a `raws` prop. If `false`,
   * just swaps the tag and keeps the HTML list in the component's slot.
   * @default false
   */
  extractData?: boolean;

  /**
   * Tag name of the component the `<ul>`/`<ol>` is replaced with.
   * @default "div"
   */
  componentName?: string;

  /**
   * Additional props to add on the component.
   */
  props?: Record<
    string,
    boolean | number | string | null | undefined | Array<string | number>
  >;
}

/** Extracts a node's text content, excluding any nested `<ul>`/`<ol>` (their text is collected separately by `parseList`). */
function getTextNoLists(node: Element): string {
  if (!node.children) return "";
  return node.children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (
        child.type === "element" &&
        child.tagName !== "ul" &&
        child.tagName !== "ol"
      ) {
        return getTextNoLists(child);
      }
      return "";
    })
    .join("");
}

interface ListItem {
  label: string;
  /** Only set when this item has a nested list — `true` for `<ol>`, `false` for `<ul>`. */
  ordered?: boolean;
  /** Nested list items, if this item's `<li>` contains a sub-`<ul>`/`<ol>`. */
  children?: ListItem[];
}

/**
 * Recursively parses a `<ul>`/`<ol>` element into `ListItem`s. Each `<li>`
 * becomes one item, with its own text (excluding nested lists) as `label`.
 * Only the first nested `<ul>`/`<ol>` found in an `<li>` is parsed into
 * `children` — a second sibling sub-list would be ignored.
 */
function parseList(node: Element): ListItem[] {
  return node.children
    .filter((n): n is Element => n.type === "element" && n.tagName === "li")
    .map((li) => {
      const childElements = li.children.filter(
        (n): n is Element => n.type === "element",
      );

      const subLists = childElements.filter(
        (n) => n.tagName === "ul" || n.tagName === "ol",
      );

      const label = getTextNoLists(li).trim();

      const item: ListItem = { label };

      if (subLists.length > 0) {
        const sub = subLists[0];
        item.ordered = sub.tagName === "ol";
        item.children = parseList(sub);
      }

      return item;
    });
}

export const rehypeList: Plugin<RehypeUListOptions, Root> = function (options) {
  const {
    extractData = false,
    componentName = "div",
    props: userProps = {},
  } = options;

  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (
        (node.tagName !== "ul" && node.tagName !== "ol") ||
        !parent ||
        index === undefined
      ) {
        return;
      }

      const isOrdered = node.tagName === "ol";

      if (!extractData) {
        // ── Slot mode ──
        // Replace <ul>/<ol> with the component tag; its children (the <li>s)
        // are kept as-is and rendered inside the component's slot.
        node.tagName = componentName;

        const props: Record<string, string | boolean | number> = {
          ...userProps,
          ordered: isOrdered,
        };

        // `class` can be a single string or an array of tokens on a hast
        // element — normalize it to a single string prop either way.
        if (node.properties?.class) {
          const cls = Array.isArray(node.properties.class)
            ? node.properties.class.join(" ")
            : String(node.properties.class);
          props.class = cls;
        }

        node.properties = props;
        return;
      }

      // ── Props mode (raws) ──
      // Drop the original <li>s entirely and pass the parsed list as a
      // single JSON-encoded `raws` prop instead (hast properties must be
      // serializable, so a nested object can't be passed directly).
      const items = parseList(node);

      const component: Element = {
        type: "element",
        tagName: componentName,
        properties: {
          ...userProps,
          ordered: isOrdered,
          raws: JSON.stringify({ items }),
        },
        children: [],
      };

      parent.children.splice(index, 1, component);
    });
  };
};
