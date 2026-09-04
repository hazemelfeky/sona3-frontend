<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/store'
import { useFamilyAidHistory, type AidHistoryRow } from '@/features/aid/composables/useAid'
import { formatMoney, formatNumber, formatDateDMY } from '@/utils/format'

const props = defineProps<{ familyId: number }>()

const store = useStore()
// The detail page already gates on families.view — defence in depth.
const canView = computed(() => store.hasPerm('families.view'))
const canRecord = computed(() => store.hasPerm('aid.manage'))

const { visits, loading, error, refresh } = useFamilyAidHistory(() => props.familyId)

// عيني shows as "name × qty" with no price; مالي shows its amount. Rendered
// on one line per visit, e.g. "مرتبة × 1 — كرتونة 400 — لحمة 500 ج".
function itemLabel(item: AidHistoryRow) {
  if (item.item_type === 'cash') {
    return `${item.item_name ?? '—'} - ${formatMoney(item.amount)}`
  }
  return `${item.item_name ?? '—'} × ${formatNumber(item.quantity)}`
}

const inventoryNames = (items: AidHistoryRow[]) =>
  items.filter((i) => i.item_type === 'inventory').map((i) => i.item_name ?? '—')
</script>

<template>
  <UCard v-if="canView">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-medium">سجل التنفيذات</h3>
        <UButton
          v-if="canRecord"
          :to="`/families/${familyId}/aid/new`"
          icon="i-lucide-hand-heart"
          label="تنفيذ"
          size="sm"
          variant="soft"
          color="neutral"
        />
      </div>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
      :actions="[
        { label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: refresh },
      ]"
    />

    <div v-else-if="loading" class="space-y-2">
      <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
    </div>

    <p v-else-if="!visits.length" class="text-dimmed text-sm text-center py-8">
      لسه مفيش تنفيذات مسجلة
    </p>

    <div v-else class="space-y-3 p-2">
      <div
        v-for="visit in visits"
        :key="visit.aid_id"
        class="border-default rounded-lg border p-3 space-y-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">{{ formatDateDMY(visit.aid_date) }}</span>
          <span v-if="visit.volunteers.length" class="text-xs text-dimmed">
            {{ visit.volunteers.join('، ') }}
          </span>
        </div>

        <p v-if="!visit.items.length" class="text-dimmed text-sm">مفيش مساعدات مسجلة</p>

        <div v-else class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="item in visit.items"
            :key="item.item_id ?? undefined"
            :color="item.item_type === 'cash' ? 'success' : 'primary'"
            variant="subtle"
          >
            {{ itemLabel(item) }}
          </UBadge>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-1">
          <span v-if="visit.cashTotal > 0">
            <span class="text-dimmed">إجمالي المبالغ:</span>
            {{ formatMoney(visit.cashTotal) }}
          </span>
          <span v-if="inventoryNames(visit.items).length">
            <span class="text-dimmed">عيني:</span>
            {{ inventoryNames(visit.items).join('، ') }}
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>
