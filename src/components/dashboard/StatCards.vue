<script setup lang="ts">
import type { CardDef } from '@/config/dashboards'
import { formatValue } from '@/utils/format'

const props = defineProps<{
  cards: CardDef[]
  stats: Record<string, unknown> | null
  loading: boolean
  error: string | null
}>()

// Written out in full so Tailwind's static scanner can find the classes —
// a template-literal class name (`bg-${color}/10`) would be invisible to it.
const colorClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-neutral/10 text-neutral',
}

function colorFor(card: CardDef): string {
  if (typeof card.color === 'function') return card.color(props.stats?.[card.key])
  return card.color ?? 'primary'
}

function iconClass(card: CardDef): string {
  return colorClasses[colorFor(card)] ?? colorClasses.primary ?? 'bg-primary/10 text-primary'
}
</script>

<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />

  <p v-else-if="!loading && !stats" class="text-dimmed text-sm">لا توجد إحصائيات متاحة حالياً</p>

  <UPageGrid v-else class="gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <template v-if="loading">
      <UCard v-for="n in cards.length" :key="n">
        <USkeleton class="mb-3 h-4 w-24" />
        <USkeleton class="h-7 w-32" />
      </UCard>
    </template>

    <template v-else>
      <UCard v-for="card in cards" :key="card.key">
        <div class="flex items-center gap-3 p-2">
          <div v-if="card.icon" class="shrink-0 rounded-lg p-2" :class="iconClass(card)">
            <UIcon :name="card.icon" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-dimmed text-sm">{{ card.label }}</p>
            <p class="text-xl font-semibold break-words">{{ formatValue(stats?.[card.key], card.format) }}</p>
          </div>
        </div>
      </UCard>
    </template>
  </UPageGrid>
</template>
