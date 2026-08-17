<script setup lang="ts">
import { useMembersList } from '@/features/permissions/composables/useMembersList'

const { rows, loading, error, search, statusFilter } = useMembersList()

const statusOptions = [
  { label: 'الكل', value: 'all' },
  { label: 'قيد المراجعة', value: 'pending' },
  { label: 'مقبول', value: 'approved' },
  { label: 'مرفوض', value: 'rejected' },
]

const statusLabel = (status: string) =>
  ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' })[status] ?? status
const statusColor = (status: string) => (status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning')
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">إدارة الصلاحيات</h1>

    <div class="flex flex-wrap items-center gap-3">
      <UInput v-model="search" icon="i-lucide-search" placeholder="بحث بالاسم..." class="w-64" />
      <USelectMenu
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        label-key="label"
        class="w-40"
      />
    </div>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />

    <template v-else>
      <template v-if="loading">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </template>

      <template v-else>
        <RouterLink v-for="row in rows" :key="row.user_id" :to="`/permissions/${row.user_id}`" class="block">
          <UCard class="cursor-pointer hover:bg-elevated/50 transition-colors">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium">{{ row.full_name || row.username }}</p>
                <p class="text-sm text-dimmed">@{{ row.username }} · {{ row.area || '—' }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span class="text-sm text-dimmed">{{ row.perms.length }} صلاحية</span>
                <UBadge :color="statusColor(row.status)" variant="subtle">{{ statusLabel(row.status) }}</UBadge>
              </div>
            </div>
          </UCard>
        </RouterLink>

        <p v-if="rows.length === 0" class="text-center text-dimmed py-12">لا يوجد أعضاء</p>
      </template>
    </template>
  </div>
</template>
