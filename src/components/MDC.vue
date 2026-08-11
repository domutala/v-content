<script lang="ts">
import { computed, defineComponent } from "vue";
import type { Root } from "hast";

import MDCRenderer from "./MDCRenderer.vue";
import { parseHtml } from "../mdc/parse-html.js";

export default defineComponent({
  name: "MDC",

  components: {
    MDCRenderer,
  },

  props: {
    /** entry.html d'une entrée de collection "page" */
    value: {
      type: String,
      required: true,
    },
  },

  setup(props) {
    const root = computed<Root>(() => parseHtml(props.value));

    return {
      root,
    };
  },
});
</script>

<template>
  <MDCRenderer
    v-for="(child, index) in root.children"
    :key="index"
    :node="child"
  />
</template>
