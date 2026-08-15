<script setup lang="ts">
import "./assets/main.css";

import { useAsyncState, useColorMode } from "@vueuse/core";
import { UseColorMode } from "@vueuse/components";
import SiteHeader from "./components/SiteHeader.vue";
import SidebarProvider from "./components/ui/sidebar/SidebarProvider.vue";
import SidebarInset from "./components/ui/sidebar/SidebarInset.vue";
import Sidebar from "./components/ui/sidebar/Sidebar.vue";

const mode = useColorMode();

const {
  state: data,
  isReady,
  isLoading,
  error,
} = useAsyncState(queryCollection("docs").path("/docs/get-started").first());
</script>

<!--
<template>
  <main>
    <MDC :value="html" />
  </main>
</template> -->

<template>
  <div class="[--header-height:calc(--spacing(14))]">
    <SidebarProvider class="flex flex-col">
      <!-- <AppSidebar variant="inset" /> -->
      <Sidebar
        class="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      ></Sidebar>

      <SidebarInset>
        <SiteHeader />

        <div class="w-3xl my-10 mx-auto space-y-5">
          <UseColorMode v-slot="color">
            <u-button
              @click="color.mode = color.mode === 'dark' ? 'light' : 'dark'"
            >
              Mode {{ color.mode }}
            </u-button>
          </UseColorMode>

          <MDC v-if="data" :value="data.html" />

          <UDialog>
            <UDialogTrigger>Open</UDialogTrigger>
            <UDialogContent>
              <UDialogHeader>
                <UDialogTitle>Are you absolutely sure?</UDialogTitle>
                <UDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </UDialogDescription>
              </UDialogHeader>
            </UDialogContent>
          </UDialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>
