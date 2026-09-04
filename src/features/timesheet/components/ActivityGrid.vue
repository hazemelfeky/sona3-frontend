<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, computed, watch } from 'vue'
import {
  fetchDailyActivity,
  gridRange,
  toDateKey,
  type DailyActivityRow,
} from '@/features/timesheet/composables/useDailyActivity'
import { formatHours } from '@/features/timesheet/utils/duration'
import { formatDateDMY } from '@/utils/format'

const props = defineProps<{
  userId: string
  // Pre-fetched rows for this user. Pages that render many grids at once
  // (/timesheet/all) load the whole view in one query and pass the slice
  // down instead of paying a round-trip per volunteer.
  rows?: DailyActivityRow[] | null
}>()

interface Cell {
  key: string
  date: Date
  count: number
  minutes: number
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}

const loaded = ref<DailyActivityRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const { start, end } = gridRange()
const since = toDateKey(start)

async function load() {
  // Rows supplied by the parent — nothing to fetch.
  if (props.rows) {
    loaded.value = props.rows
    return
  }
  loading.value = true
  error.value = null
  try {
    loaded.value = await fetchDailyActivity(props.userId, since)
  } catch (e) {
    error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل النشاط')
    loaded.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.userId, props.rows] as const, load, { immediate: true })

function levelFor(minutes: number): Cell['level'] {
  if (minutes <= 0) return 0
  if (minutes <= 60) return 1
  if (minutes <= 180) return 2
  if (minutes <= 360) return 3
  return 4
}

// The view only returns days that have activity, so the full 53-week grid is
// built here and the returned days are painted onto it.
const weeks = computed<Cell[][]>(() => {
  const byDate = new Map(loaded.value.map((r) => [r.task_date, r]))
  const out: Cell[][] = []
  const cursor = new Date(start)
  let week: Cell[] = []

  while (cursor <= end) {
    const key = toDateKey(cursor)
    const hit = byDate.get(key)
    const minutes = Number(hit?.total_minutes ?? 0)
    week.push({
      key,
      date: new Date(cursor),
      count: Number(hit?.task_count ?? 0),
      minutes,
      level: levelFor(minutes),
      future: false,
    })
    if (week.length === 7) {
      out.push(week)
      week = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  // Pad the trailing partial week so the last column keeps its Sun..Sat
  // alignment; the padding cells render invisible.
  if (week.length) {
    while (week.length < 7) {
      week.push({
        key: `pad-${week.length}`,
        date: new Date(end),
        count: 0,
        minutes: 0,
        level: 0,
        future: true,
      })
    }
    out.push(week)
  }
  return out
})

const totalContributions = computed(() =>
  loaded.value.reduce((sum, r) => sum + Number(r.task_count ?? 0), 0),
)

const monthFormatter = new Intl.DateTimeFormat('ar-EG', { month: 'short' })

// One label per column, only where the week is the first of a new month.
const monthLabels = computed(() =>
  weeks.value.map((week, i) => {
    const month = week[0]!.date.getMonth()
    if (i === 0) return ''
    return month === weeks.value[i - 1]![0]!.date.getMonth()
      ? ''
      : monthFormatter.format(week[0]!.date)
  }),
)

// Sun..Sat rows; only alternate rows are labelled, the way GitHub does it,
// so the labels don't crowd the 12px cells.
const weekdayLabels = ['', 'إثنين', '', 'أربعاء', '', 'جمعة', '']

function tooltipFor(cell: Cell) {
  if (cell.future) return ''
  const date = formatDateDMY(cell.date)
  if (!cell.count) return `${date} — لا يوجد نشاط`
  return `${date} — ${cell.count} مهمة · ${formatHours(cell.minutes)}`
}
</script>

<template>
  <div class="space-y-2">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <USkeleton v-else-if="loading" class="h-32 w-full" />

    <template v-else>
      <p class="text-sm font-medium">{{ totalContributions }} مساهمة في آخر سنة</p>

      <!-- Forced LTR: the grid reads oldest-to-newest left-to-right like the
           GitHub original, and the month labels have to follow it. -->
      <div class="overflow-x-auto pb-1" dir="ltr">
        <div class="inline-flex gap-1">
          <div class="flex flex-col gap-1 pt-5 pr-1">
            <div
              v-for="(label, i) in weekdayLabels"
              :key="i"
              class="h-3 w-10 text-right text-[9px] leading-3 text-dimmed"
            >
              {{ label }}
            </div>
          </div>

          <div class="min-w-0">
            <div class="flex gap-1 h-5">
              <div v-for="(label, i) in monthLabels" :key="i" class="relative w-3 shrink-0">
                <span
                  v-if="label"
                  class="absolute left-0 top-0 text-[10px] whitespace-nowrap text-dimmed"
                >
                  {{ label }}
                </span>
              </div>
            </div>

            <div class="flex gap-1">
              <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-1">
                <div
                  v-for="cell in week"
                  :key="cell.key"
                  class="ag-cell size-3 shrink-0"
                  :class="cell.future ? 'invisible' : `ag-l${cell.level}`"
                  :title="tooltipFor(cell)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-1 text-[10px] text-dimmed">
        <span>أقل</span>
        <span v-for="l in [0, 1, 2, 3, 4]" :key="l" class="ag-cell size-3" :class="`ag-l${l}`" />
        <span>أكثر</span>
      </div>
    </template>
  </div>
</template>

<!-- Not scoped: the level colours are the GitHub contribution scale, kept as
     literal hex rather than theme tokens so the ramp stays readable in both
     themes (the app's own palette has no green scale). -->
<style>
.ag-cell {
  border-radius: 2px;
  outline: 1px solid rgb(27 31 35 / 0.06);
  outline-offset: -1px;
}
.ag-l0 {
  background-color: #ebedf0;
}
.ag-l1 {
  background-color: #9be9a8;
}
.ag-l2 {
  background-color: #40c463;
}
.ag-l3 {
  background-color: #30a14e;
}
.ag-l4 {
  background-color: #216e39;
}

.dark .ag-cell {
  outline-color: rgb(255 255 255 / 0.05);
}
.dark .ag-l0 {
  background-color: #2d333b;
}
.dark .ag-l1 {
  background-color: #0e4429;
}
.dark .ag-l2 {
  background-color: #006d32;
}
.dark .ag-l3 {
  background-color: #26a641;
}
.dark .ag-l4 {
  background-color: #39d353;
}
</style>
