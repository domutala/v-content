<script setup lang="ts">
import MDC from "v-content/components/MDC.js";

defineProps<{ content: string }>();
</script>

<template>
  <MDC :value="content" />
</template>
