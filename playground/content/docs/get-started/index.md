---
title: Installation
description: Créez ou intégrez Syora en une seule commande.
---

# Installation

Ouvrez un terminal (si vous utilisez [Visual Studio Code](https://code.visualstudio.com), vous pouvez ouvrir un [terminal intégré](https://code.visualstudio.com/docs/terminal/basics)) et utilisez la commande suivante pour créer un nouveau projet de démarrage :

::u-code-group
```bash [npm]
npm create syora@latest
```

```bash [yarn]
yarn create syora
```

```bash [pnpm]
pnpm create syora@latest
```

```bash [bun]
bun create syora@latest
```

```bash [deno]
deno -A npm:create-syora@latest
```
::

```
✔ What do you want to create?
  ● Add to an existing project
    You already have a backend and you want to add the Vue layer
  ○ Start with a starter
    Express, Fastify, NestJS, AdonisJS, Hono, Koa...

✔ Which backend framework are you using?
  ● Express
  ○ Fastify
  ○ NestJS
  ○ AdonisJS
  ○ Hono
  ○ Koa
  ○ Other (I will configure it myself)
```

## Ce que vous devez faire ensuite

Connectez Syora à votre serveur existant. Si l'assistant a généré un `server.ts`, modifiez-le pour y intégrer vos routes API existantes.

::u-code-group

```ts [Express]
// server.ts (généré par l'assistant — à compléter)
import express from "express";
import { createServer, requestNode } from "@syora/core";

const app = express();

// ← Vos routes API existantes restent inchangées
app.get("/api/users", (req, res) => {
	res.json([{ id: 1, name: "Alice" }]);
});

// ← Syora gère tout le reste
const vite = await createServer();
if (vite) app.use(vite.middlewares);

app.use("*all", async (req, res) => {
	await requestNode({ vite, req, res });
});

app.listen(3000);
```

```ts [Fastify]
// server.ts
import Fastify from "fastify";
import middie from "@fastify/middie";
import { createServer, serve } from "@syora/core";

const app = Fastify();

// ← Vos routes API existantes
app.get("/api/users", async () => {
	return [{ id: 1, name: "Alice" }];
});

// ← Syora
const vite = await createServer();
await app.register(middie);
if (vite) app.use(vite.middlewares);

app.all("*", async (req, reply) => {
	const html = await serve({ vite, url: req.raw.url ?? req.url });
	reply.type("text/html").send(html);
});

await app.listen({ port: 3000 });
```

```ts [NestJS]
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createServer, requestNode } from "@syora/core";

const app = await NestFactory.create(AppModule);
const vite = await createServer();

// Vos controllers NestJS gèrent /api/*
// Syora gère le reste
app.use("*", async (req, res, next) => {
	if (req.path.startsWith("/api")) return next();
	await requestNode({ vite, req, res });
});

await app.listen(3000);
```

```ts [Koa]
import Koa from "koa";
import c2k from "koa-connect";
import serveStatic from "koa-static";
import { createServer, requestNode } from "@syora/core";

const app = new Koa();
const vite = await createServer();

// Middleware Vite dev server
if (vite) app.use(c2k(vite.middlewares));

// Assets statiques
app.use(serveStatic("./public"));

// Catch-all : Syora gère les pages Vue
app.use(async (ctx) => {
	await requestNode({ vite, req: ctx.req, res: ctx.res });
});

app.listen(3000);
```

```ts [AdonisJS]
// start/routes.ts
import router from "@adonisjs/core/services/router";
import { createServer, requestNode } from "@syora/core";

const vite = await createServer();

// Vos routes API AdonisJS
router.get("/api/users", async () => {
	return [{ id: 1, name: "Alice" }];
});

// Catch-all : Syora gère les pages Vue
router.get("*", async ({ request, response }) => {
	await requestNode({
		vite,
		req: request.request,
		res: response.response,
	});
});
```

```ts [Bun]
import { createServer, requestWeb } from "@syora/core";

const vite = await createServer();

Bun.serve({
	port: 3000,
	async fetch(req) {
		const html = await requestWeb({ vite, req });
		return new Response(html, {
			headers: { "Content-Type": "text/html" },
		});
	},
});
```

```ts [Others]

```



::

::u-alert

::u-icon
---
name: IconCircleCheck
---
::

::u-alert-title
Vos routes API ne bougent pas
::

::u-alert-description
L'intégration Syora est **additive**. Vous ne migrez rien. Syora ne capture que les requêtes qui ne correspondent pas à vos API existantes.
::    
::

## Vérifier l'installation

Créez votre première page pour valider :

```vue
<!-- app/pages/index.vue -->
<script setup>
const message = "Hello Syora";
</script>

<template>
	<div>
		<h1>{{ message }}</h1>
		<p>Syora est installé et fonctionne.</p>
	</div>
</template>
```

```bash
pnpm dev
```

Rendez-vous sur [`http://localhost:3000`](http://localhost:3000). Vous voyez votre page.

## Prochaine étape

Votre projet est prêt. Créons votre première page interactive : [Quick Start](./quickstart.md).
