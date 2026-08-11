import { unified } from "unified";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";

const parser = unified().use(rehypeParse, { fragment: true });

/** Parses MDC-compiled HTML back into a hast tree for dynamic rendering. */
export function parseHtml(html: string): Root {
  return parser.parse(html) as Root;
}
