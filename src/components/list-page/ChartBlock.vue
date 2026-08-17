<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import type { ChartDef } from '@/config/dashboards'
import { useChartData } from '@/composables/useChartData'
import { formatMoney, formatNumber } from '@/utils/format'

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps<{ chart: ChartDef }>()
const emit = defineEmits<{ filterClick: [key: string, value: string] }>()

const { rows, loading, error } = useChartData(props.chart.source)

function onChartClick(params: { name: string }) {
  if (props.chart.filterKey) emit('filterClick', props.chart.filterKey, params.name)
}

function formatAxisValue(v: number): string {
  return props.chart.format === 'money' ? formatMoney(v) : formatNumber(v)
}

const option = computed(() => {
  const isPie = props.chart.type === 'pie' || props.chart.type === 'donut'
  const labels = Array.from(new Set(rows.value.map((r) => r.label)))

  if (isPie) {
    return {
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}: ${formatAxisValue(p.value)}` },
      legend: { type: 'scroll', bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 12 } },
      series: [
        {
          type: 'pie',
          center: ['50%', '42%'],
          radius: props.chart.type === 'donut' ? ['40%', '60%'] : '60%',
          label: { show: false },
          labelLine: { show: false },
          data: rows.value.map((r) => ({ name: r.label, value: r.value })),
        },
      ],
    }
  }

  if (props.chart.grouped) {
    const seriesNames = Array.from(new Set(rows.value.map((r) => r.series ?? '')))
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatAxisValue(v) },
      legend: { bottom: 0 },
      grid: { left: 8, right: 8, top: 24, bottom: 32, containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { interval: 0, rotate: labels.length > 6 ? 30 : 0 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatAxisValue(v) } },
      series: seriesNames.map((name) => ({
        type: props.chart.type,
        name,
        data: labels.map((label) => rows.value.find((r) => r.label === label && (r.series ?? '') === name)?.value ?? 0),
      })),
    }
  }

  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatAxisValue(v) },
    grid: { left: 8, right: 8, top: 16, bottom: 32, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { interval: 0, rotate: labels.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatAxisValue(v) } },
    series: [
      {
        type: props.chart.type,
        name: props.chart.title,
        data: rows.value.map((r) => r.value),
      },
    ],
  }
})
</script>

<template>
  <UCard :class="chart.span === 2 ? 'sm:col-span-2' : ''">
    <template #header>
      <h3 class="font-medium">{{ chart.title }}</h3>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />
    <USkeleton v-else-if="loading" class="h-64 w-full" />
    <p v-else-if="rows.length === 0" class="text-dimmed py-10 text-center text-sm">
      لا توجد بيانات لعرضها في هذا الرسم البياني
    </p>
    <div v-else class="h-64 w-full" :class="chart.filterKey ? 'cursor-pointer' : ''">
      <VChart :option="option" autoresize style="height: 100%; width: 100%" @click="onChartClick" />
    </div>
  </UCard>
</template>
