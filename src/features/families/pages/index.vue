<route lang="yaml">
meta:
  requiresPerm: families.view
</route>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useStore } from '@/store'
import DashboardView from '@/components/list-page/DashboardView.vue'
import DeleteFamilyModal from '@/components/DeleteFamilyModal.vue'
import PrintSheetPickerModal from '@/features/families/components/PrintSheetPickerModal.vue'
import MonthlySheet from '@/features/families/components/MonthlySheet.vue'
import { familiesListConfig } from '@/features/families/config/list'
import type { PrintSheetType } from '@/features/families/config/printSheets'
import { fetchBulkPrintFamilies, type BulkPrintFamily } from '@/features/families/composables/useBulkPrintData'
import { formatDateDMY } from '@/utils/format'

const router = useRouter()
const store = useStore()

function onRowClick(row: Record<string, unknown>) {
  router.push(`/families/${row.family_id}`)
}

const dashboardView = ref<InstanceType<typeof DashboardView> | null>(null)
const deleteTarget = ref<{ id: number; name: string | null } | null>(null)
const deleteModalOpen = ref(false)

function familyRowActions(row: Record<string, unknown>): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = []
  if (store.hasPerm('families.edit')) {
    items.push({
      label: 'تعديل',
      icon: 'i-lucide-pencil',
      onSelect: () => router.push(`/families/${row.family_id}/edit`),
    })
  }
  if (store.hasPerm('families.delete')) {
    items.push({
      label: 'مسح',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => {
        deleteTarget.value = { id: row.family_id as number, name: (row.head_name as string) ?? null }
        deleteModalOpen.value = true
      },
    })
  }
  return items
}

function onFamilyDeleted() {
  dashboardView.value?.refresh()
}

// --- Bulk selection + print (gated on families.execute; may not exist as a
// permission row yet — store.hasPerm then just returns false, hiding this
// whole block, which is expected rather than a bug). ---

const canBulkPrint = computed(() => store.hasPerm('families.view'))

const selectedIds = ref<Set<unknown>>(new Set())

function toggleRow(id: unknown) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

async function selectAllMatching() {
  const ids = (await dashboardView.value?.fetchMatchingIds('family_id')) ?? []
  const next = new Set(selectedIds.value)
  for (const id of ids) next.add(id)
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

const pickerOpen = ref(false)

const bulkPrintFamilies = ref<BulkPrintFamily[]>([])
const bulkSheetType = ref<PrintSheetType | null>(null)
const bulkPrinting = ref(false)

async function onSheetTypeConfirmed(sheetType: PrintSheetType) {
  bulkPrinting.value = true
  try {
    const ids = Array.from(selectedIds.value) as number[]
    bulkPrintFamilies.value = await fetchBulkPrintFamilies(ids)
    bulkSheetType.value = sheetType

    await nextTick()

    const originalTitle = document.title
    document.title = `${sheetType.name} ${formatDateDMY(new Date()).replace(/\//g, '-')}`
    window.addEventListener(
      'afterprint',
      () => {
        document.title = originalTitle
      },
      { once: true },
    )
    window.print()
  } finally {
    bulkPrinting.value = false
  }
}
</script>

<template>
  <div class="print:hidden">
    <div v-if="canBulkPrint" class="mb-4 flex flex-wrap items-center gap-3">
      <UButton label="تحديد الكل" variant="soft" color="neutral" icon="i-lucide-check-check" @click="selectAllMatching" />
      <UButton
        v-if="selectedIds.size > 0"
        label="إلغاء التحديد"
        variant="ghost"
        color="neutral"
        @click="clearSelection"
      />
      <span v-if="selectedIds.size > 0" class="text-dimmed text-sm">
        تم تحديد {{ selectedIds.size }} أسرة
      </span>
      <UButton
        v-if="selectedIds.size > 0"
        label="طباعة شيت"
        icon="i-lucide-printer"
        :loading="bulkPrinting"
        @click="pickerOpen = true"
      />
    </div>

    <DashboardView
      ref="dashboardView"
      :config="familiesListConfig"
      :row-actions="familyRowActions"
      :selectable="canBulkPrint"
      row-key="family_id"
      :selected-ids="selectedIds"
      @row-click="onRowClick"
      @toggle-row="toggleRow"
    >
      <template v-if="store.hasPerm('families.create')" #actions>
        <UButton to="/families/new" icon="i-lucide-plus" label="إضافة أسرة" />
      </template>
    </DashboardView>

    <DeleteFamilyModal
      v-model:open="deleteModalOpen"
      :family-id="deleteTarget?.id ?? null"
      :family-name="deleteTarget?.name ?? null"
      @deleted="onFamilyDeleted"
    />

    <PrintSheetPickerModal
      v-model:open="pickerOpen"
      :selected-count="selectedIds.size"
      @confirm="onSheetTypeConfirmed"
    />
  </div>

  <MonthlySheet
    v-if="bulkSheetType"
    class="hidden print:block"
    :families="bulkPrintFamilies"
    :rows-per-page="bulkSheetType.rowsPerPage"
  />
</template>
