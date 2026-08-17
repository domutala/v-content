<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  ordered?: boolean;
  raws: string;
}>();

const data = computed(() => {
  try {
    return JSON.parse(props.raws) as {
      items: Array<{
        label: string;
        ordered?: boolean;
        children?: unknown[];
      }>;
    };
  } catch {
    return { items: [] };
  }
});
</script>

<template>
  <component
    :is="ordered ? 'ol' : 'ul'"
    class="u-list space-y-1 pl-5"
    :class="ordered ? 'list-decimal' : 'list-disc'"
  >
    <li
      v-for="(item, i) in data.items"
      :key="i"
      class="leading-relaxed whitespace-nowrap"
    >
      <span class="flex flex-wrap items-center gap-1">
        <MDC :value="item.label" />
      </span>
      <UProseList
        v-if="item.children?.length"
        :raws="JSON.stringify({ items: item.children })"
        :ordered="item.ordered"
        class="mt-1"
      />
    </li>
  </component>
</template>

<!-- <style scoped>
.u-list {
  @apply my-4 space-y-2;
}
.u-list :deep(li) {
  @apply relative pl-6;
}
.u-list :deep(li::before) {
  content: "";
  @apply absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-primary;
}
.u-list[ordered] :deep(li::before) {
  @apply hidden;
}
.u-list :deep(ul), .u-list :deep(ol) {
  @apply mt-2;
}
</style> -->
