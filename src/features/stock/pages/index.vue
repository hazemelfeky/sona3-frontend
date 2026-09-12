<route lang="yaml">
meta:
  requiresPerm:
    - operations.view
    - operations.manage
</route>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import {
  useStockList,
  deleteLot,
  type StockBalanceRow,
} from '@/features/stock/composables/useStock'
import StockLotFormModal from '@/features/stock/components/StockLotFormModal.vue'
import { formatMoney, formatNumber, formatDateDMY } from '@/utils/format'
import { toUserMessage } from '@/utils/errors'

const router = useRouter()
const store = useStore()
const toast = useToast()

const { rows, imageUrls, loading, error, refresh } = useStockList()

const canManage = () => store.hasPerm('operations.manage')

function openLot(row: StockBalanceRow) {
  router.push(`/stock/${row.lot_id}`)
}

const priceLabel = (value: number | null) => (value === null ? 'تبرع عيني' : formatMoney(value))

// A lot with stock left reads green; a spent one reads blue — same signal as
// the big رصيد figure on the detail page.
const rowClass = (row: { original: StockBalanceRow }) =>
  row.original.status === 'empty'
    ? 'bg-blue-50/70 dark:bg-blue-950/30'
    : 'bg-green-50/70 dark:bg-green-950/30'

/* ---- add / edit ---- */

const formOpen = ref(false)
const editTarget = ref<StockBalanceRow | null>(null)

function openAdd() {
  editTarget.value = null
  formOpen.value = true
}
function openEdit(row: StockBalanceRow) {
  editTarget.value = row
  formOpen.value = true
}

/* ---- delete ---- */

const deleteOpen = ref(false)
const deleteTarget = ref<StockBalanceRow | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function openDelete(row: StockBalanceRow) {
  deleteTarget.value = row
  deleteError.value = ''
  deleteOpen.value = true
}

async function onConfirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteLot(deleteTarget.value.lot_id, deleteTarget.value.image_path)
    deleteOpen.value = false
    await refresh()
    toast.add({ title: 'تم مسح المنتج', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (e) {
    deleteError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">المخزون</h1>
      <UButton v-if="canManage()" icon="i-lucide-plus" label="إضافة منتج" @click="openAdd" />
    </div>

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

    <template v-else>
      <template v-if="loading">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </template>

      <UTable
        v-else
        :data="rows"
        :ui="{ tr: 'cursor-pointer' }"
        :meta="{ class: { tr: rowClass } }"
        :columns="[
          { accessorKey: 'image_path', header: 'صورة' },
          { accessorKey: 'name', header: 'المنتج' },
          { accessorKey: 'received_at', header: 'تاريخ الإضافة' },
          { accessorKey: 'unit_price', header: 'السعر' },
          { accessorKey: 'quantity_in', header: 'الكمية' },
          { accessorKey: 'quantity_left', header: 'المتبقي' },
          ...(canManage() ? [{ id: 'actions', header: '' }] : []),
        ]"
        @select="(_e: Event, row: { original: StockBalanceRow }) => openLot(row.original)"
      >
        <template #image_path-cell="{ row }">
          <img
            v-if="row.original.image_path && imageUrls[row.original.image_path]"
            :src="imageUrls[row.original.image_path]"
            :alt="row.original.name ?? 'صورة المنتج'"
            loading="lazy"
            class="size-10 rounded-md object-cover bg-elevated ring-1 ring-default"
          />
          <div
            v-else
            class="size-10 rounded-md bg-elevated ring-1 ring-default flex items-center justify-center"
          >
            <UIcon name="i-lucide-image-off" class="text-dimmed size-4" />
          </div>
        </template>
        <template #name-cell="{ row }">{{ row.original.name || '—' }}</template>
        <template #received_at-cell="{ row }">{{
          formatDateDMY(row.original.received_at)
        }}</template>
        <template #unit_price-cell="{ row }">{{ priceLabel(row.original.unit_price) }}</template>
        <template #quantity_in-cell="{ row }">{{
          formatNumber(row.original.quantity_in)
        }}</template>
        <template #quantity_left-cell="{ row }">
          <span class="font-medium">{{ formatNumber(row.original.quantity_left) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1" @click.stop>
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              aria-label="تعديل"
              @click="openEdit(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="sm"
              color="error"
              variant="ghost"
              aria-label="مسح"
              @click="openDelete(row.original)"
            />
          </div>
        </template>
      </UTable>

      <p v-if="!loading && rows.length === 0" class="text-center text-dimmed py-12">
        لا توجد منتجات في المخزون
      </p>
    </template>

    <StockLotFormModal v-model:open="formOpen" :lot="editTarget" @saved="refresh" />

    <UModal v-model:open="deleteOpen" title="حذف المنتج؟">
      <template #body>
        <p class="text-sm">
          هتمسح
          <span class="font-semibold">{{ deleteTarget?.name || 'المنتج ده' }}</span>
          نهائيًا، ومعاه كل سجلات التوزيع الخاصة بيه. وده إجراء لا رجعة فيه.
        </p>

        <UAlert
          v-if="deleteError"
          color="error"
          variant="subtle"
          :title="deleteError"
          icon="i-lucide-alert-circle"
          class="mt-4"
        />
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="إلغاء"
            variant="ghost"
            color="neutral"
            :disabled="deleting"
            @click="deleteOpen = false"
          />
          <UButton label="مسح نهائيًا" color="error" :loading="deleting" @click="onConfirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
