import { toText } from "hast-util-to-text";

import { parseHtml } from "./parse-html.js";

/** Returns the visible plain text of an HTML fragment, similarly to innerText. */
export function htmlToText(html: string): string {
  return toText(parseHtml(html));
}
