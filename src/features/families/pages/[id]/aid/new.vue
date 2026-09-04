<route lang="yaml">
meta:
  requiresPerm: aid.manage
</route>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AidForm from '@/features/aid/components/AidForm.vue'

const route = useRoute()
const familyId = computed(() => Number((route.params as Record<string, string>).id))
</script>

<template>
  <AidForm :family-id="familyId" />
</template>
