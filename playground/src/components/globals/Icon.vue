<script lang="ts" setup>
import * as icons from "@tabler/icons-vue";
import { computed } from "vue";

const props = defineProps<{ name: keyof typeof icons }>();

const icon = computed(() => {
  return icons[props.name];
});
</script>

<template>
  <Component :is="icon" />
</template>
