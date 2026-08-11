import { unified } from "unified";
import { read } from "to-vfile";
import type { VFile } from "vfile";

import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkMDC from "remark-mdc";
import remarkGFM from "remark-gfm";
import remarkEmoji from "remark-emoji";
import remarkFlexibleToc, { HeadingDepth } from "remark-flexible-toc";

import rehypeRaw from "rehype-raw";
import rehypeExternalLinks from "rehype-external-links";
import rehypeMinifyWhitespace from "rehype-minify-whitespace";
import rehypeSlug from "rehype-slug";
import rehypeSortAttributeValues from "rehype-sort-attribute-values";
import rehypeSortAttributes from "rehype-sort-attributes";
import rehypeStringify from "rehype-stringify";

import remarkMeta from "./meta.js";

function getSkipLevels(maxDepth: number): HeadingDepth[] {
  if (maxDepth < 1 || maxDepth > 6) {
    throw new Error("Le nombre doit être compris entre 1 et 6.");
  }

  return Array.from(
    { length: 6 - maxDepth },
    (_, index) => (maxDepth + index + 1) as HeadingDepth,
  );
}

export async function mdc(
  options: ({ value: string | VFile } | { file: string }) & {
    /** @default 3 */
    maxDepth?: HeadingDepth;

    root?: string;
  },
) {
  const { maxDepth = 3, root } = options;

  const processor = unified()
    .use(remarkParse)

    .use(remarkMeta, { root })
    .use(remarkMDC)
    .use(remarkGFM)
    .use(remarkEmoji)
    .use(remarkFlexibleToc, { skipLevels: getSkipLevels(maxDepth) })
    .use(remarkRehype, { allowDangerousHtml: true })

    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeMinifyWhitespace)
    .use(rehypeExternalLinks)
    .use(rehypeSortAttributeValues)
    .use(rehypeSortAttributes)

    .use(rehypeStringify);

  let value: string | VFile;

  if ("file" in options) value = await read(options.file);
  else value = options.value;

  const vfile = await processor.process(value);

  return vfile;
}
