import "./assets/main.css";

import { createApp } from "./app";

const { app, router } = createApp();

await router.isReady();
app.mount("#app");
