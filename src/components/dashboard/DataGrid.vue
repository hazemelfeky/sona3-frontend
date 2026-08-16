<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ColumnDef } from '@/config/dashboards'
import { formatValue } from '@/utils/format'

const props = defineProps<{
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  loading: boolean
  error: string | null
  total: number
  pageSize: number
}>()

const page = defineModel<number>('page', { required: true })
const sortKey = defineModel<string>('sortKey', { required: true })
const sortDir = defineModel<'asc' | 'desc'>('sortDir', { required: true })

const emit = defineEmits<{ rowClick: [row: Record<string, unknown>] }>()

const tableColumns = computed<TableColumn<Record<string, unknown>>[]>(() =>
  props.columns.map((col) => ({ accessorKey: col.key, header: col.label })),
)

const rangeStart = computed(() => (props.total === 0 ? 0 : (page.value - 1) * props.pageSize + 1))
const rangeEnd = computed(() => rangeStart.value + props.rows.length - (props.rows.length ? 1 : 0))

function toggleSort(col: ColumnDef) {
  if (col.sortable === false) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
}

function badgeColor(value: unknown): 'success' | 'error' | 'neutral' {
  const v = String(value ?? '')
  if (v === 'مقبولة') return 'success'
  if (v === 'مرفوضة') return 'error'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-3">
    <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />

    <template v-else>
      <p class="text-muted text-sm">
        عرض {{ rangeStart }}-{{ rangeEnd }} من {{ total }}
      </p>

      <UTable
        :data="rows"
        :columns="tableColumns"
        :loading="loading"
        empty="لا توجد بيانات لعرضها هنا"
        :ui="{ tr: 'cursor-pointer' }"
        @select="(_e: Event, row: { original: Record<string, unknown> }) => emit('rowClick', row.original)"
      >
        <template v-for="col in columns" :key="`h-${col.key}`" #[`${col.key}-header`]>
          <button
            type="button"
            class="flex items-center gap-1"
            :class="col.sortable === false ? 'cursor-default' : 'cursor-pointer hover:text-highlighted'"
            @click="toggleSort(col)"
          >
            {{ col.label }}
            <UIcon
              v-if="sortKey === col.key"
              :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
              class="size-3"
            />
          </button>
        </template>

        <template v-for="col in columns" :key="`c-${col.key}`" #[`${col.key}-cell`]="{ row }">
          <UBadge v-if="col.format === 'badge'" :color="badgeColor(row.getValue(col.key))" variant="subtle">
            {{ formatValue(row.getValue(col.key), col.format) }}
          </UBadge>
          <span v-else>{{ formatValue(row.getValue(col.key), col.format) }}</span>
        </template>
      </UTable>

      <div v-if="total > pageSize" class="flex justify-center">
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>
    </template>
  </div>
</template>
