<script setup lang="ts">
import { ref, computed, useSlots } from "vue";
import { IconCheck, IconCopy } from "@tabler/icons-vue";
import { useClipboard } from "@vueuse/core";

const slots = useSlots();
const activeIndex = ref(0);
const { copy, copied } = useClipboard({});

const root = ref<HTMLElement | null>(null);
const panels = computed(() => slots.default?.() ?? []);

const tabs = computed(() =>
  panels.value.map((vnode, i) => {
    let props = vnode.props || {};

    if (typeof vnode.key === "string") {
      props = JSON.parse(vnode.key).properties;
    }

    return {
      label: props.tag || props.label || props.language || `Tab ${i + 1}`,
      index: i,
    };
  }),
);

const hasMultiple = computed(() => tabs.value.length > 1);

async function copyCode() {
  const code = root.value?.querySelector("div.block pre code");
  if (!code) return;

  const text = code.textContent ?? "";
  copy(text);
}
</script>

<template>
  <div
    class="u-code-group group my-6 overflow-hidden rounded-md border border-border/50 dark:bg-muted/12 bg-muted/70"
  >
    <!-- Tabs -->
    <div
      v-if="hasMultiple"
      class="flex items-center gap-1 border-b border-border/50 px-2 h-8"
    >
      <button
        v-for="tab in tabs"
        :key="tab.index"
        type="button"
        class="relative px-3 py-2 text-xs font-medium transition-colors"
        :class="[
          activeIndex === tab.index
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="activeIndex = tab.index"
      >
        {{ tab.label }}
        <span
          v-if="activeIndex === tab.index"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        />
      </button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        class="group-not-[&:hover]:hidden ml-auto"
        :aria-label="copied ? 'Code copied' : 'Copy code'"
        @click="copyCode"
      >
        <IconCheck v-if="copied" class="size-3.5" />
        <IconCopy v-else class="size-3.5" />
      </Button>
    </div>

    <!-- Panels -->
    <div class="relative" ref="root">
      <div
        v-for="(child, i) in panels"
        :key="i"
        :class="activeIndex === i ? 'block' : 'hidden'"
        class="[&>pre]:p-5"
      >
        <component :is="child" />
      </div>
    </div>
  </div>
</template>
