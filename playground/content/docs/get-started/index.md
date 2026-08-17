---
title: Installation
description: Créez ou intégrez Syora en une seule commande.
---

|                            | Nuxt                     | Syora                                      |
| -------------------------- | ------------------------ | ------------------------------------------ |
| **Courbe d'apprentissage** | Douce                    | Douce (mêmes conventions)                  |
| **Configuration**          | `nuxt.config.ts`         | `syora.config.ts`                          |
|                  | `nuxt dev`, `nuxt build` | `syora dev`, `syora build`                 |
| **Auto-imports**           | Composables, composants  | Composables, composants, globals           |
| **TypeScript**             | Excellent                | Excellent (types générés pour les modules) |
| **Devtools**               | Nuxt DevTools            | 🚧 (roadmap)                               |

---


::u-code-group

```ts [Express]
import express from "express";
import { createServer, requestNode } from "@syora/core";

const app = express();
const vite = await createServer();

app.get("/api/users", (req, res) => {
  res.json([{ id: 1, name: "Alice" }]);
});

app.use("*all", (req, res) => requestNode({ vite, req, res }));

app.listen(3000);
```

```ts [Fastify]
import Fastify from "fastify";
import { createServer, serve } from "@syora/core";

const app = Fastify();
const vite = await createServer();

app.get("/api/users", async () => [{ id: 1, name: "Alice" }]);

app.all("*", async (req, reply) => {
  const html = await serve({ vite, url: req.raw.url ?? req.url });
  reply.type("text/html").send(html);
});

await app.listen({ port: 3000 });
```

::

- <u-icon name="tabler:circle-check-filled"></u-icon> Premier élément
- Deuxième élément
  - Sous-élément A
  - Sous-élément B
- Troisième élément

1. Étape 1
2. Étape 2
   1. Sous-étape

---

<u-icon name="tabler:circle-check-filled"></u-icon>

Un [lien avec du `code`](https://example.com) ou une [**image**](/img)
