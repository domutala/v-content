import { join } from "node:path";

import { ContentConfig, resolveContentConfig } from "./collection/index.js";

export let config: ContentConfig & { compresseds: Record<string, string> };

export async function initContent(_config?: ContentConfig) {
  config = _config ?? ({ collections: {} } as any);

  config.output ??= join(process.cwd(), ".content");
  config.root ??= join(process.cwd(), "content");

  const { compresseds } = await resolveContentConfig(config, {
    root: config.root,
    output: config.output,
  });

  config.compresseds = compresseds;

  return config;
}
