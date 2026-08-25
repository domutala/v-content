<script setup lang="ts">
import "./assets/main.css";

import { useAsyncState } from "@vueuse/core";
import { UseColorMode } from "@vueuse/components";

const {
  state: data,
  isReady,
  isLoading,
  error,
} = useAsyncState(queryCollection("docs").first(), null);
</script>

<!--
<template>
  <main>
    <MDC :value="html" />
  </main>
</template> -->

<template>
  <div v-if="data" class="w-3xl my-10 mx-auto space-y-5">
    {{ data.previous }}
    {{ data.next }}
    <UseColorMode v-slot="color">
      <u-button @click="color.mode = color.mode === 'dark' ? 'light' : 'dark'">
        Mode {{ color.mode }}
      </u-button>
    </UseColorMode>

    <div>
      <!-- {{ data }} -->
    </div>

    <!-- <MDC v-if="data" :value="data.html" /> -->

    <UDialog>
      <UDialogTrigger>Open</UDialogTrigger>
      <UDialogContent>
        <UDialogHeader>
          <UDialogTitle>Are you absolutely sure?</UDialogTitle>
          <UDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </UDialogDescription>
        </UDialogHeader>
      </UDialogContent>
    </UDialog>
  </div>
  <div v-else class="w-3xl my-10 mx-auto">Chargement du playground…</div>
</template>
