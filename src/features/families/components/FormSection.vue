<script setup lang="ts">
import type { FormFieldDef } from '@/features/families/config/form'
import type { FamilyFormState } from '@/features/families/composables/useFamilyForm'
import FieldRenderer from '@/features/families/components/FieldRenderer.vue'

const props = defineProps<{
  fields: readonly FormFieldDef[]
  prefix?: string
  form: FamilyFormState
}>()
const emit = defineEmits<{ change: [fullKey: string, value: string] }>()

function fullKey(key: string): string {
  return `${props.prefix ?? ''}${key}`
}

function getValue(key: string): string {
  return (props.form as unknown as Record<string, string>)[fullKey(key)] ?? ''
}
</script>

<template>
  <template v-for="field in fields" :key="fullKey(field.key)">
    <slot :name="fullKey(field.key)" :field="field" :full-key="fullKey(field.key)">
      <FieldRenderer
        :field="field"
        :model-value="getValue(field.key)"
        @update:model-value="(v: string) => emit('change', fullKey(field.key), v)"
      />
    </slot>
  </template>
</template>
