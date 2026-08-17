<script lang="ts" setup>
import { Icon } from "@iconify/vue";

defineProps<{ name: string }>();
</script>

<template>
  <Icon :icon="name" />
</template>
