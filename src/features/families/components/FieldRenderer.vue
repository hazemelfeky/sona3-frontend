<script setup lang="ts">
import type { FormFieldDef } from '@/features/families/config/form'

const props = defineProps<{ field: FormFieldDef; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <UFormField
    :label="field.label || undefined"
    :class="field.type === 'textarea' ? 'sm:col-span-full' : ''"
  >
    <UInput
      v-if="field.type !== 'select' && field.type !== 'textarea'"
      v-model="value"
      :type="field.type"
      class="w-full"
    />
    <USelectMenu
      v-else-if="field.type === 'select'"
      v-model="value"
      :items="field.options"
      :placeholder="field.placeholder"
      class="w-full"
    />
    <UTextarea v-else v-model="value" :rows="field.rows ?? 2" class="w-full" />
  </UFormField>
</template>
