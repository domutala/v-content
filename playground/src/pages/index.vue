<script setup lang="ts">
import SiteHeader from "@/components/SiteHeader.vue";

// useSeoMeta({
//   title: siteConfig.name,
//   titleTemplate: `%s - ${siteConfig.name}`,
//   description: siteConfig.description,
// })
// defineOgImage('Custom')
</script>

<template>
  <div
    data-slot="layout"
    class="group/layout relative z-10 flex min-h-svh flex-col bg-background has-data-[slot=designer]:h-svh has-data-[slot=designer]:overflow-hidden"
  >
    <SiteHeader />
    <main class="flex min-h-0 flex-1 flex-col">
      <div class="mx-auto py-16 max-w-3xl">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsum eos
        recusandae enim cupiditate incidunt dolorem impedit? Odio velit labore
        sit deleniti. Eveniet consequatur maxime, repellat quod mollitia eos
        aliquid rerum!
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
