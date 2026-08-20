import { createSSRApp } from "vue";
import { createMemoryHistory, createRouter, createWebHistory } from "vue-router";

import App from "./App.vue";
import autoComponents from "virtual:auto-components";
import HomeView from "./pages/index.vue";

const routes = [{ path: "/", component: HomeView }];

export function createApp() {
  const app = createSSRApp(App);
  const router = createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  });

  app.use(router);
  app.use(autoComponents);

  return { app, router };
}
