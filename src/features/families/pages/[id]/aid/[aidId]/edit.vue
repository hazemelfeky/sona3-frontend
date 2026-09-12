<route lang="yaml">
meta:
  requiresPerm: operations.manage
</route>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AidForm from '@/features/aid/components/AidForm.vue'

const route = useRoute()
const params = computed(() => route.params as Record<string, string>)
const familyId = computed(() => Number(params.value.id))
const aidId = computed(() => Number(params.value.aidId))

// Editing is reached from the executions list and from the aid's own page,
// so `from` carries where to go back to; the aid page is the sane default.
const returnTo = computed(() => (route.query.from as string) || `/aid/${aidId.value}`)
</script>

<template>
  <AidForm :family-id="familyId" :aid-id="aidId" :return-to="returnTo" />
</template>
