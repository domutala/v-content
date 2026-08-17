import type { Element, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";

import { Plugin } from "../types.js";

export interface RehypeUTableOptions {
  /**
   * If `true`, extracts the HTML table's data and passes it as `columns`
   * and `rows` props instead. Otherwise, the raw HTML table is kept in the
   * component's slot.
   * @default false
   */
  extractData?: boolean;

  /**
   * Tag name of the component the `<table>` is replaced with.
   * @default "table"
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

/**
 * Extracts a node's inner HTML. Unlike a plain text extraction, this
 * preserves inline elements (icons, images, custom tags, emphasis, links,
 * etc.) as serialized HTML instead of discarding them.
 */
function getHtml(node: Element): string {
  if (!node.children) return "";
  return toHtml({ type: "root", children: node.children });
}

/**
 * Extracts `columns`/`rows`-shaped data from an HTML `<table>` element.
 * Headers come from the first `<tr>` found under `<thead>` (its `<th>`
 * cells); a cell with no matching header falls back to `col{index}` as its
 * key. Rows come from every `<tr>` under `<tbody>`, keyed the same way.
 * Cell content is kept as HTML so inline elements survive extraction.
 */
function parseTable(node: Element) {
  const thead = node.children.find(
    (n): n is Element => n.type === "element" && n.tagName === "thead",
  );
  const tbody = node.children.find(
    (n): n is Element => n.type === "element" && n.tagName === "tbody",
  );

  const headerRow = thead?.children.find(
    (n): n is Element => n.type === "element" && n.tagName === "tr",
  );
  const headers =
    headerRow?.children
      .filter((n): n is Element => n.type === "element" && n.tagName === "th")
      .map((th) => getHtml(th).trim()) ?? [];

  const bodyRows =
    tbody?.children.filter(
      (n): n is Element => n.type === "element" && n.tagName === "tr",
    ) ?? [];

  const rows = bodyRows.map((tr) => {
    const cells = tr.children.filter(
      (n): n is Element => n.type === "element" && n.tagName === "td",
    );
    const row: Record<string, string> = {};
    cells.forEach((td, i) => {
      const key = headers[i] ?? `col${i}`;
      row[key] = getHtml(td).trim();
    });
    return row;
  });

  return { headers, rows };
}

export const rehypeTable: Plugin<RehypeUTableOptions, Root> = function (
  options,
) {
  const { extractData = false, componentName = "table", props = {} } = options;

  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) {
        return;
      }

      if (!extractData) {
        // ── Slot strategy ──
        // Replace <table> with the component tag and keep its children as-is.
        // The raw HTML table is then rendered inside the component's slot.
        node.tagName = componentName;

        // Carry over any class attribute from the original <table>.
        if (node.properties?.class) {
          props.class = node.properties.class;
        }

        node.properties = {
          ...props,
          ...node.properties,
        };

        return;
      }

      const { headers, rows } = parseTable(node);

      const columns = headers.map((h) => ({
        key: h, //.toLowerCase().replace(/\s+/g, "-"),
        label: h,
      }));

      const component: Element = {
        type: "element",
        tagName: componentName,

        properties: { ...props },

        children: [], // No children — everything is passed through props instead.
      };

      // HTML/hast element properties must be serializable, so the extracted
      // data is JSON-encoded into a single `raws` attribute rather than
      // passed as a nested object.
      Object.assign(component.properties, {
        raws: JSON.stringify({ columns, rows }),
      });

      parent.children.splice(index, 1, component);
    });
  };
};
