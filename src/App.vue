<script setup lang="ts">
import { ar } from '@nuxt/ui/locale'
import PwaUpdateToast from '@/components/PwaUpdateToast.vue'
import InstallBanner from '@/components/InstallBanner.vue'
</script>

<template>
  <UApp :locale="ar">
    <PwaUpdateToast />
    <router-view />
    <InstallBanner />
  </UApp>
</template>

<style scoped></style>
