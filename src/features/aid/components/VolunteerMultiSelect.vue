<script setup lang="ts">
import { useVolunteerOptions } from '@/features/aid/composables/useAid'

// Multiple volunteers can run one execution, so this always emits an array —
// aid_volunteers is a join table, never a single column on aid.
const selected = defineModel<string[]>({ required: true })

const { options, loading, error } = useVolunteerOptions()
</script>

<template>
  <UFormField label="المتطوعون القائمون على التنفيذ" required>
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
    />
    <USelectMenu
      v-else
      v-model="selected"
      multiple
      searchable
      :items="options"
      :loading="loading"
      value-key="user_id"
      label-key="label"
      placeholder="اختر متطوع أو أكتر"
      class="w-full"
    />
  </UFormField>
</template>
