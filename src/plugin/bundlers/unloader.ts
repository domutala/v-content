import Components from "unplugin-vue-components";

import { ContentConfig } from "../../collection/collection.js";
import { initContent } from "../../init.js";
import plugin from "../unplugin.js";
import { join, resolve } from "node:path";

export default async function <TConfig extends ContentConfig | undefined>(
  config: TConfig,
) {
  const _config = await initContent(config);

  return [
    plugin.unloader(_config),

    Components.unloader({
      dirs: resolve(import.meta.dirname, "../../components"),
      dts: join(_config.output!, "./components.d.ts"),
    }),
  ];
}
