import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import express from "express";

const root = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5173);
const server = express();

let vite;

if (isProduction) {
  server.use(
    express.static(path.resolve(root, "dist/client"), { index: false }),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "custom",
  });
  server.use(vite.middlewares);
}

server.use(async (request, response, next) => {
  const url = request.originalUrl;

  try {
    let template;
    let render;

    if (isProduction) {
      template = await fs.readFile(
        path.resolve(root, "dist/client/index.html"),
        "utf-8",
      );
      ({ render } = await import("./dist/server/entry-server.js"));
    } else {
      template = await fs.readFile(path.resolve(root, "index.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);
      ({ render } = await vite.ssrLoadModule("/src/entry-server.ts"));
    }

    const appHtml = await render(url);
    const html = template.replace("<!--app-html-->", appHtml);

    response.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    next(error);
  }
});

server.listen(port, () => {
  console.log(`Playground SSR running at http://localhost:${port}`);
});
