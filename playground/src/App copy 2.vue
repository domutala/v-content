<script setup lang="ts">
import { ConfigProvider, TooltipProvider } from "reka-ui";
import SiteBody from "./components/SiteBody.vue";
</script>

<template>
  <SiteBody>
    <ConfigProvider>
      <TooltipProvider>
        <RouterView />
      </TooltipProvider>
    </ConfigProvider>
  </SiteBody>
</template>
