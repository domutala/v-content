import { createApp, defineAsyncComponent, h } from "vue";

const DocsPage = defineAsyncComponent(() => import("./DocsPage.vue"));

createApp({ render: () => h(DocsPage, { content: "<p>Hello MDC</p>" }) }).mount(
  "#app",
);
