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

import rehypeShiki from "@shikijs/rehype";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";

import remarkMeta from "./meta.js";
import type { Plugin, PluginTuple } from "./types.js";

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

    plugins: PluginTuple[];
  },
) {
  const { maxDepth = 3, root } = options;

  const usePlugin: Plugin<{
    plugins: PluginTuple[];
    root?: string;
    maxDepth: number;
  }> = function (options) {
    for (const plugin of options.plugins) {
      this.use(plugin[0], {
        root: options.root,
        maxDepth: options.maxDepth,
        ...(plugin[1] ?? {}),
      });
    }

    return () => {};
  };

  const processor = unified()
    .use(remarkParse)
    .use(remarkMeta, { root })
    .use(remarkMDC)
    .use(remarkGFM)
    .use(remarkEmoji)
    .use(remarkFlexibleToc, { skipLevels: getSkipLevels(maxDepth) })
    .use(remarkRehype, { allowDangerousHtml: true })

    .use(usePlugin, { root, maxDepth, plugins: options.plugins ?? [] })

    .use(rehypeShiki, {
      themes: {
        light: "vitesse-light",
        dark: "vitesse-dark",
      },

      defaultColor: false,

      transformers: [
        transformerMetaHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus({
          classActiveLine: "has-focus",
          classActivePre: "has-focused-lines",
        }),
        transformerNotationHighlight(),
        transformerNotationErrorLevel(),
        transformerMetaWordHighlight(),

        {
          code() {
            const raw = this.options.meta?.__raw;
            if (!raw) return;
            const parsed: Record<string, string> = {};

            this.pre.properties ??= {};

            const tag = raw.match(/(\[)([A-Za-z0-9_-]+)(\])/);
            Object.assign(this.pre.properties, { tag: tag?.at(2) });

            for (const match of raw.matchAll(/(\w+)=([^\s]+)/g)) {
              parsed[match[1]] = match[2];
            }

            Object.assign(this.pre.properties, { ...parsed });
          },
        },

        {
          name: "vitepress:add-dir",
          code(hast) {
            hast.properties.dir = "ltr";
          },
        },

        {
          pre(hast) {
            hast.properties.language = this.options.lang;
          },
        },
      ],

      addLanguageClass: true,
    })

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
