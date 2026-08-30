import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";

/** Parses MDC-compiled HTML back into a hast tree for dynamic rendering. */
export function parseHtml(html: string): Root {
  return fromHtml(html, { fragment: true });
}
