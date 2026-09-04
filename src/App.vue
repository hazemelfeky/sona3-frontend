<script setup lang="ts">
import { ar } from '@nuxt/ui/locale'
import PwaUpdateToast from '@/components/PwaUpdateToast.vue'
</script>

<template>
  <UApp :locale="ar">
    <PwaUpdateToast />
    <router-view />
  </UApp>
</template>

<style scoped></style>
