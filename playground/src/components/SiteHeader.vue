<script setup lang="ts">
import ModeSwitcher from "./ModeSwitcher.vue";

// import { PlusSignIcon } from '@hugeicons/core-free-icons'
// import { HugeiconsIcon } from '@hugeicons/vue'
// import { siteConfig } from '@/lib/config'
// import { Separator } from '@/registry/new-york-v4/ui/separator'
// import { Button } from '@/styles/reka-nova/ui/button'
// import { getColors } from '~/lib/colors'

// const { data } = await useNavigation()
// const docData = computed(() => data.value!.find(i => i.stem === 'docs')!)
</script>

<template>
  <header class="sticky top-0 z-50 w-full bg-background">
    <div
      class="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none 3xl:fixed:px-0"
    >
      <div
        class="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container"
      >
        Syora

        <div class="ml-auto"></div>

        <ModeSwitcher />
      </div>
    </div>
  </header>
</template>
