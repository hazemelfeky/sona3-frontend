<route lang="yaml">
meta:
  requiresPerm: stock.view
</route>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '@/store'
import { useStockLot, type StockDistributionRow } from '@/features/stock/composables/useStock'
import { formatMoney, formatNumber, formatDateDMY } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const store = useStore()

const lotId = computed(() => Number((route.params as Record<string, string>).lotId))
const isValidId = computed(() => Number.isInteger(lotId.value) && lotId.value > 0)

const { lot, imageUrl, distributions, notFound, loading, error, reload } = useStockLot(lotId)

const priceLabel = computed(() =>
  lot.value?.unit_price === null || lot.value?.unit_price === undefined
    ? 'تبرع عيني'
    : formatMoney(lot.value.unit_price),
)

const hasStock = computed(() => (lot.value?.quantity_left ?? 0) > 0)

// Distributing draws on both sides of the workflow, so either permission is
// enough to reach it.
const canDistribute = computed(
  () => hasStock.value && (store.hasPerm('stock.manage') || store.hasPerm('aid.manage')),
)

function openFamily(row: StockDistributionRow) {
  router.push(`/families/${row.family_id}`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <UButton
      to="/stock"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع للمخزون"
    />

    <div
      v-if="!isValidId"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">معرف المنتج غير صالح</p>
    </div>

    <template v-else-if="loading">
      <USkeleton class="h-6 w-48" />
      <USkeleton class="h-48 w-full" />
      <USkeleton class="h-32 w-full" />
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
      :actions="[
        { label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: reload },
      ]"
    />

    <div
      v-else-if="notFound || !lot"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-package-x" class="text-dimmed size-10" />
      <p class="text-lg font-medium">لم يتم العثور على المنتج</p>
    </div>

    <template v-else>
      <UCard>
        <div class="grid gap-4 sm:grid-cols-[200px_1fr]">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :alt="lot.name ?? 'صورة المنتج'"
            class="w-full rounded-md object-cover bg-elevated ring-1 ring-default aspect-square"
          />
          <div
            v-else
            class="w-full rounded-md bg-elevated ring-1 ring-default aspect-square flex items-center justify-center"
          >
            <UIcon name="i-lucide-image-off" class="text-dimmed size-8" />
          </div>

          <div class="min-w-0 space-y-3">
            <h1 class="text-2xl font-semibold">{{ lot.name || '—' }}</h1>

            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-dimmed">السعر</dt>
                <dd>{{ priceLabel }}</dd>
              </div>
              <div>
                <dt class="text-dimmed">تاريخ الإضافة</dt>
                <dd>{{ formatDateDMY(lot.received_at) }}</dd>
              </div>
            </dl>

            <div v-if="lot.note">
              <p class="text-dimmed text-sm">ملاحظة</p>
              <p class="bg-elevated rounded-md p-3 text-sm whitespace-pre-wrap">{{ lot.note }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-medium">الرصيد</h3></template>
        <div class="grid grid-cols-3 gap-3 text-center p-2">
          <div>
            <p class="text-dimmed text-xs">الكمية الأصلية</p>
            <p class="text-xl font-semibold">{{ formatNumber(lot.quantity_in) }}</p>
          </div>
          <div>
            <p class="text-dimmed text-xs">اتوزّع</p>
            <p class="text-xl font-semibold">{{ formatNumber(lot.quantity_out) }}</p>
          </div>
          <div>
            <p class="text-dimmed text-xs">المتبقي</p>
            <p
              class="text-4xl font-bold"
              :class="
                hasStock ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
              "
            >
              {{ formatNumber(lot.quantity_left) }}
            </p>
          </div>
        </div>

        <!-- canDistribute already requires stock left. -->
        <div v-if="canDistribute" class="pt-4 flex justify-center">
          <UButton
            size="lg"
            icon="i-lucide-package-check"
            label="تنفيذ / توزيع لأسر"
            :to="`/stock/${lotId}/distribute`"
          />
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-medium">اتوزّع لمين</h3></template>

        <p v-if="!distributions.length" class="text-dimmed text-sm text-center py-8">
          لسه متوزعش على أي أسرة
        </p>

        <UTable
          v-else
          :data="distributions"
          :ui="{ tr: 'cursor-pointer' }"
          :columns="[
            { accessorKey: 'family_head', header: 'الأسرة' },
            { accessorKey: 'family_area', header: 'المنطقة' },
            { accessorKey: 'quantity', header: 'الكمية' },
            { accessorKey: 'distributed_at', header: 'التاريخ' },
          ]"
          @select="(_e: Event, row: { original: StockDistributionRow }) => openFamily(row.original)"
        >
          <template #family_head-cell="{ row }">{{ row.original.family_head || '—' }}</template>
          <template #family_area-cell="{ row }">{{ row.original.family_area || '—' }}</template>
          <template #quantity-cell="{ row }">{{ formatNumber(row.original.quantity) }}</template>
          <template #distributed_at-cell="{ row }">
            {{ formatDateDMY(row.original.distributed_at) }}
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
