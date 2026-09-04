<route lang="yaml">
meta:
  requiresPerm: users.view
</route>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVolunteersList, type VolunteerRow } from '@/features/volunteers/composables/useVolunteersList'
import { getAvatarSignedUrl } from '@/utils/avatar'
import { normalizeEgyptPhone } from '@/utils/format'

const router = useRouter()
const { rows, loading, error, search, statusFilter, stateFilter, refresh } = useVolunteersList()

const statusOptions = [
  { label: 'الكل', value: 'all' },
  { label: 'قيد المراجعة', value: 'pending' },
  { label: 'مقبول', value: 'approved' },
  { label: 'مرفوض', value: 'rejected' },
]
const stateOptions = [
  { label: 'الكل', value: 'all' },
  { label: 'جديد', value: 'new' },
  { label: 'نشط', value: 'active' },
  { label: 'أساسي', value: 'core' },
  { label: 'قائد', value: 'leader' },
  { label: 'غير نشط', value: 'inactive' },
]

const statusLabel = (status: string) =>
  ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' })[status] ?? status
const statusColor = (status: string) => (status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning')
const stateLabel = (state: string | null) =>
  ({ new: 'جديد', active: 'نشط', core: 'أساسي', leader: 'قائد', inactive: 'غير نشط' })[state ?? ''] ?? (state || '—')

const avatarUrls = ref<Record<string, string | null>>({})
watch(
  rows,
  async (list) => {
    const entries = await Promise.all(
      list.map(async (r) => [r.user_id, await getAvatarSignedUrl(r.avatar_path)] as const),
    )
    avatarUrls.value = Object.fromEntries(entries)
  },
  { immediate: true },
)

function openVolunteer(row: VolunteerRow) {
  router.push(`/volunteers/${row.user_id}`)
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">المتطوعون</h1>

    <div class="flex flex-wrap items-center gap-3">
      <UInput v-model="search" icon="i-lucide-search" placeholder="بحث بالاسم أو الرقم..." class="w-64" />
      <USelectMenu v-model="statusFilter" :items="statusOptions" value-key="value" label-key="label" class="w-40" />
      <USelectMenu v-model="stateFilter" :items="stateOptions" value-key="value" label-key="label" class="w-40" />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
      :actions="[{ label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: refresh }]"
    />

    <template v-else>
      <template v-if="loading">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </template>

      <UTable
        v-else
        :data="rows"
        :ui="{ tr: 'cursor-pointer' }"
        :columns="[
          { accessorKey: 'full_name', header: 'الاسم' },
          { accessorKey: 'phone', header: 'الموبايل' },
          { accessorKey: 'area', header: 'المنطقة' },
          { accessorKey: 'status', header: 'الحالة' },
          { accessorKey: 'volunteer_state', header: 'حالة التطوع' },
          { accessorKey: 'team', header: 'الفريق' },
        ]"
        @select="(_e: Event, row: { original: VolunteerRow }) => openVolunteer(row.original)"
      >
        <template #full_name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :src="avatarUrls[row.original.user_id] ?? undefined" :alt="row.original.full_name ?? row.original.username" size="sm" />
            <span>{{ row.original.full_name || row.original.username }}</span>
          </div>
        </template>
        <template #phone-cell="{ row }">{{ normalizeEgyptPhone(row.original.phone) }}</template>
        <template #area-cell="{ row }">{{ row.original.area || '—' }}</template>
        <template #status-cell="{ row }">
          <UBadge :color="statusColor(row.original.status)" variant="subtle">{{ statusLabel(row.original.status) }}</UBadge>
        </template>
        <template #volunteer_state-cell="{ row }">{{ stateLabel(row.original.volunteer_state) }}</template>
        <template #team-cell="{ row }">{{ row.original.team || '—' }}</template>
      </UTable>

      <p v-if="!loading && rows.length === 0" class="text-center text-dimmed py-12">لا يوجد متطوعون</p>
    </template>
  </div>
</template>
