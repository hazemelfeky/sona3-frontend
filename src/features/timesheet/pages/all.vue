<route lang="yaml">
meta:
  requiresPerm: timesheet.view_all
</route>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { db, warnIfEmptyFromRls } from '@/lib/supabase'
import ActivityGrid from '@/features/timesheet/components/ActivityGrid.vue'
import {
  fetchAllDailyActivity,
  gridRange,
  toDateKey,
  type DailyActivityRow,
} from '@/features/timesheet/composables/useDailyActivity'
import { formatHours } from '@/features/timesheet/utils/duration'
import { getAvatarSignedUrl } from '@/utils/avatar'

interface VolunteerRow {
  user_id: string
  full_name: string | null
  username: string
  avatar_path: string | null
}

const volunteers = ref<VolunteerRow[]>([])
const daily = ref<DailyActivityRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const since = toDateKey(gridRange().start)

async function load() {
  loading.value = true
  error.value = null
  try {
    // Volunteers and the whole activity view in two queries — each grid then
    // renders from the slice passed to it instead of querying per person.
    const [{ data, error: err }, activity] = await Promise.all([
      db
        .from('profiles')
        .select('user_id, full_name, username, avatar_path')
        .eq('status', 'approved')
        .order('full_name'),
      fetchAllDailyActivity(since),
    ])
    if (err) throw err

    volunteers.value = (data ?? []) as VolunteerRow[]
    warnIfEmptyFromRls('profiles', volunteers.value.length === 0, false)
    daily.value = activity
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'حصلت مشكلة أثناء تحميل البيانات'
    volunteers.value = []
    daily.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const rowsByUser = computed(() => {
  const map = new Map<string, DailyActivityRow[]>()
  for (const row of daily.value) {
    const list = map.get(row.user_id)
    if (list) list.push(row)
    else map.set(row.user_id, [row])
  }
  return map
})

function statsFor(userId: string) {
  const rows = rowsByUser.value.get(userId) ?? []
  return {
    tasks: rows.reduce((sum, r) => sum + Number(r.task_count ?? 0), 0),
    minutes: rows.reduce((sum, r) => sum + Number(r.total_minutes ?? 0), 0),
  }
}

const avatarUrls = ref<Record<string, string | null>>({})
watch(volunteers, async (list) => {
  const entries = await Promise.all(
    list.map(async (v) => [v.user_id, await getAvatarSignedUrl(v.avatar_path)] as const),
  )
  avatarUrls.value = Object.fromEntries(entries)
})
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <h1 class="text-2xl font-semibold">تايم شيت الكل</h1>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <template v-else-if="loading">
      <USkeleton v-for="i in 3" :key="i" class="h-48 w-full" />
    </template>

    <p v-else-if="!volunteers.length" class="text-center text-dimmed py-12">لا يوجد متطوعون</p>

    <template v-else>
      <UCard v-for="volunteer in volunteers" :key="volunteer.user_id">
        <template #header>
          <div class="flex items-center gap-3">
            <UAvatar
              :src="avatarUrls[volunteer.user_id] ?? undefined"
              :alt="volunteer.full_name ?? volunteer.username"
              size="md"
            />
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="`/profile/${volunteer.user_id}`"
                class="font-semibold truncate hover:underline"
              >
                {{ volunteer.full_name || volunteer.username }}
              </RouterLink>
              <p class="text-xs text-dimmed">
                {{ statsFor(volunteer.user_id).tasks }} مهمة ·
                {{ formatHours(statsFor(volunteer.user_id).minutes) }} في آخر سنة
              </p>
            </div>
          </div>
        </template>

        <ActivityGrid
          :user-id="volunteer.user_id"
          :rows="rowsByUser.get(volunteer.user_id) ?? []"
        />
      </UCard>
    </template>
  </div>
</template>
