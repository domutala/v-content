import Components from "unplugin-vue-components";

import { ContentConfig } from "../../collection/collection.js";
import { initContent } from "../../init.js";
import plugin from "../index.js";
import { join, resolve } from "node:path";

export default async function <TConfig extends ContentConfig | undefined>(
  config: TConfig,
) {
  const _config = await initContent(config);

  return [
    plugin.farm(_config),
    Components.farm({
      dirs: resolve(import.meta.dirname, "../../components"),
      dts: join(_config.output!, "./components.d.ts"),
    }),
  ];
}
