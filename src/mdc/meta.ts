import type { Plugin } from "unified";
import type { Node } from "unist";
import { parse as parseYaml } from "yaml";
import remarkFrontmatter from "remark-frontmatter";
import { extname, relative, join, sep } from "node:path";
import { existsSync, readFileSync } from "node:fs";

interface Yaml extends Node {
  value: string;
}

interface NavigationFile {
  meta?: Record<string, unknown>;
  path?: string;
}

function readNavigationFile(dir: string): NavigationFile {
  const navigationFile = join(dir, ".navigation.yml");
  if (!existsSync(navigationFile)) return {};
  return (parseYaml(readFileSync(navigationFile, "utf8")) ??
    {}) as NavigationFile;
}

export default <Plugin<{ root?: string }[]>>function remarkMeta(opts) {
  this.use(remarkFrontmatter, ["yaml"]);

  return (tree, file) => {
    const yamlNode = tree.children?.find(
      (node): node is Yaml => node.type === "yaml",
    );

    const frontmatter = yamlNode ? parseYaml(yamlNode.value) : {};

    const root = opts.root ?? process.cwd();
    const relativePath = relative(root, file.path);
    const withoutExt = relativePath.slice(0, -extname(relativePath).length);
    const fileSegments = withoutExt.split(sep).filter(Boolean);

    const isIndex = fileSegments.at(-1) === "index";
    const dirSegments = fileSegments.slice(0, -1); // tous les dossiers parents
    const fileSegmentName = isIndex ? null : fileSegments.at(-1)!;

    // Parcours root -> dossier du fichier : accumule meta + renomme les segments
    let meta: Record<string, unknown> = {};
    const resolvedDirSegments: string[] = [];
    let currentDir = root;

    for (const segment of dirSegments) {
      currentDir = join(currentDir, segment);
      const navigation = readNavigationFile(currentDir);

      // meta hérité : chaque niveau surcharge le précédent
      meta = { ...meta, ...(navigation.meta ?? {}) };

      // path renomme UNIQUEMENT le segment de ce dossier (hérité par tous ses fichiers/sous-dossiers)
      if (navigation.path) {
        resolvedDirSegments.push(...navigation.path.split("/").filter(Boolean));
      } else {
        resolvedDirSegments.push(segment);
      }
    }

    // le frontmatter du fichier a toujours la priorité la plus haute
    meta = { ...meta, ...frontmatter };

    const finalSegments = isIndex
      ? resolvedDirSegments
      : [...resolvedDirSegments, fileSegmentName!];

    file.data.path = "/" + finalSegments.join("/");
    file.data.meta = meta;
  };
};

export interface MetaIems {
  title?: string;
  description?: string;
  icon?: string;
  [key: string]: unknown;
}

declare module "vfile" {
  export interface DataMap {
    path: string;
    meta: MetaIems;
  }
}
