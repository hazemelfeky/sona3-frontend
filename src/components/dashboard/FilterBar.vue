<script setup lang="ts">
import { ref } from 'vue'
import type { FilterDef } from '@/config/dashboards'
import { db } from '@/lib/supabase'

const props = defineProps<{
  filters: FilterDef[]
  source: string
}>()

const search = defineModel<string>('search', { required: true })
const values = defineModel<Record<string, unknown>>('values', { required: true })

const derivedOptions = ref<Record<string, { label: string; value: unknown }[]>>({})

// One request for every filter needing derived options, not one per filter —
// each select-type filter otherwise triggered its own full-table fetch.
async function loadOptions() {
  const keys = props.filters.filter((f) => f.type === 'select' && !f.options).map((f) => f.key)
  if (keys.length === 0) return

  const { data } = await db.from(props.source).select(keys.join(','))
  const rows = (data ?? []) as unknown as Record<string, unknown>[]

  for (const key of keys) {
    const unique = Array.from(
      new Set(rows.map((row) => row[key]).filter((v: unknown) => v !== null && v !== undefined && v !== '')),
    )
    derivedOptions.value[key] = unique
      .sort((a, b) => String(a).localeCompare(String(b), 'ar'))
      .map((v) => ({ label: String(v), value: v }))
  }
}

loadOptions()

function optionsFor(filter: FilterDef) {
  return filter.options ?? derivedOptions.value[filter.key] ?? []
}

function updateValue(key: string, value: unknown) {
  values.value = { ...values.value, [key]: value }
}

function clearAll() {
  values.value = {}
  search.value = ''
}

const booleanOptions = [
  { label: 'الكل', value: null },
  { label: 'نعم', value: true },
  { label: 'لا', value: false },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <UInput v-model="search" icon="i-lucide-search" placeholder="بحث..." class="w-full sm:w-64 bg-neutral" />

    <template v-for="filter in filters" :key="filter.key">
      <USelectMenu
        v-if="filter.type === 'select'"
        :model-value="values[filter.key]"
        :items="optionsFor(filter)"
        value-key="value"
        label-key="label"
        :placeholder="filter.label"
        class="w-40"
        @update:model-value="(v: unknown) => updateValue(filter.key, v)"
      />

      <USelectMenu
        v-else-if="filter.type === 'boolean'"
        :model-value="values[filter.key]"
        :items="booleanOptions"
        value-key="value"
        label-key="label"
        :placeholder="filter.label"
        class="w-32"
        @update:model-value="(v: unknown) => updateValue(filter.key, v)"
      />

      <div v-else-if="filter.type === 'dateRange'" class="flex items-center gap-1">
        <UInput
          type="date"
          :model-value="(values[filter.key] as { from?: string; to?: string } | undefined)?.from ?? ''"
          class="w-36"
          @update:model-value="
            (v: string) => updateValue(filter.key, { ...(values[filter.key] as object), from: v })
          "
        />
        <span class="text-dimmed text-sm">{{ filter.label }}</span>
        <UInput
          type="date"
          :model-value="(values[filter.key] as { from?: string; to?: string } | undefined)?.to ?? ''"
          class="w-36"
          @update:model-value="
            (v: string) => updateValue(filter.key, { ...(values[filter.key] as object), to: v })
          "
        />
      </div>

      <!-- 'contains' filters have no input of their own — set by clicking a
           chart, surfaced here only as a removable chip. -->
      <UBadge v-else-if="filter.type === 'contains' && values[filter.key]" color="primary" variant="subtle" class="gap-1">
        {{ filter.label }}: {{ values[filter.key] }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          variant="link"
          color="neutral"
          @click="updateValue(filter.key, null)"
        />
      </UBadge>
    </template>

    <UButton
      v-if="search || Object.values(values).some((v) => v !== null && v !== undefined && v !== '')"
      label="مسح الفلاتر"
      icon="i-lucide-x"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="clearAll"
    />
  </div>
</template>
