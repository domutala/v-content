<script lang="ts" setup>
defineProps<{
  block?: boolean;
}>();
</script>

<template>
  <code class="rounded-sm bg-muted px-1 py-0.5 text-sm font-mono">
    <slot />
  </code>
</template>
