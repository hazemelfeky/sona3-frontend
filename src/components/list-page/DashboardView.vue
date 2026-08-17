<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DashboardConfig } from '@/components/list-page/types'
import { useDashboardData } from '@/composables/useDashboardData'
import { useDashboardStats } from '@/composables/useDashboardStats'
import { useStore } from '@/store'
import StatCards from './StatCards.vue'
import FilterBar from './FilterBar.vue'
import DataGrid from './DataGrid.vue'
import ChartBlock from './ChartBlock.vue'

const props = defineProps<{
  config: DashboardConfig
  rowActions?: (row: Record<string, unknown>) => DropdownMenuItem[]
}>()
const emit = defineEmits<{ rowClick: [row: Record<string, unknown>] }>()

const store = useStore()

// Route guard already keeps someone without this permission from reaching
// the page — this is defense-in-depth. RLS returns an empty list, not a
// 403, so without this check a permission problem renders identically to
// "no data yet".
const forbidden = computed(() => Boolean(props.config.requiresPerm) && !store.hasPerm(props.config.requiresPerm!))

const { rows, total, loading, error, page, pageSize, sortKey, sortDir, search, filterValues, refresh } =
  useDashboardData(props.config)

const statsResult = props.config.stats ? useDashboardStats(props.config.stats.source) : null

defineExpose({ refresh })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">{{ config.title }}</h1>
      <slot name="actions" />
    </div>

    <UAlert
      v-if="forbidden"
      color="warning"
      variant="subtle"
      title="غير متاح"
      description="مفيش عندك صلاحية لعرض البيانات دي."
      icon="i-lucide-lock"
    />

    <template v-else>
      <StatCards
        v-if="config.stats"
        :cards="config.stats.cards"
        :stats="statsResult?.stats.value ?? null"
        :loading="statsResult?.loading.value ?? false"
        :error="statsResult?.error.value ?? null"
      />

      <FilterBar
        v-if="config.filters?.length"
        v-model:search="search"
        v-model:values="filterValues"
        :filters="config.filters"
        :source="config.source"
      />

      <DataGrid
        v-model:page="page"
        v-model:sort-key="sortKey"
        v-model:sort-dir="sortDir"
        :columns="config.columns"
        :rows="rows"
        :loading="loading"
        :error="error"
        :total="total"
        :page-size="pageSize"
        :row-actions="rowActions"
        @row-click="(row) => emit('rowClick', row)"
      />

      <UPageGrid v-if="config.charts?.length" class="gap-4 sm:grid-cols-2">
        <ChartBlock
          v-for="chart in config.charts"
          :key="chart.title"
          :chart="chart"
          @filter-click="(key, value) => (filterValues = { ...filterValues, [key]: value })"
        />
      </UPageGrid>
    </template>
  </div>
</template>
