import "./assets/main.css";

import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import App from "./App.vue";
import autoComponents from "virtual:auto-components";

import HomeView from "./pages/index.vue";

const routes = [{ path: "/", component: HomeView }];

const app = createApp(App);

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

app.use(router);

app.use(autoComponents);
app.mount("#app");
