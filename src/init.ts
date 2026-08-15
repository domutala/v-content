import { join } from "node:path";

import {
  ContentConfig,
  resolveContentConfig,
  ResolvedContentConfig,
} from "./collection/index.js";

export let config: ResolvedContentConfig;

export async function initContent(_config?: ContentConfig) {
  config = (_config ?? { collections: {} }) as ResolvedContentConfig;

  config.output ??= join(process.cwd(), ".content");
  config.root ??= join(process.cwd(), "content");

  const { compresseds, token } = await resolveContentConfig(config, {
    root: config.root,
    output: config.output,
  });

  config.compresseds = compresseds;
  config.token = token;

  return config;
}
