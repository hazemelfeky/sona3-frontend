<script setup lang="ts">
import type { DashboardConfig } from '@/config/dashboards'
import { useDashboardData } from '@/composables/useDashboardData'
import { useDashboardStats } from '@/composables/useDashboardStats'
import StatCards from './StatCards.vue'
import FilterBar from './FilterBar.vue'
import DataGrid from './DataGrid.vue'
import ChartBlock from './ChartBlock.vue'

const props = defineProps<{ config: DashboardConfig }>()
const emit = defineEmits<{ rowClick: [row: Record<string, unknown>] }>()

const { rows, total, loading, error, page, pageSize, sortKey, sortDir, search, filterValues } =
  useDashboardData(props.config)

const statsResult = props.config.stats ? useDashboardStats(props.config.stats.source) : null
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">{{ config.title }}</h1>

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
      @row-click="(row) => emit('rowClick', row)"
    />

    <UPageGrid v-if="config.charts?.length" class="gap-4 sm:grid-cols-2">
      <ChartBlock v-for="chart in config.charts" :key="chart.title" :chart="chart" />
    </UPageGrid>
  </div>
</template>
