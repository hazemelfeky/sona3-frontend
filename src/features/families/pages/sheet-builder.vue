<route lang="yaml">
meta:
  requiresPerm: families.sheets
</route>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import DashboardView from '@/components/list-page/DashboardView.vue'
import PrintSheetPickerModal from '@/features/families/components/PrintSheetPickerModal.vue'
import MonthlySheet from '@/features/families/components/MonthlySheet.vue'
import SaveFamilyGroupModal from '@/features/families/components/SaveFamilyGroupModal.vue'
import LoadFamilyGroupModal from '@/features/families/components/LoadFamilyGroupModal.vue'
import { buildSheetBuilderConfig } from '@/features/families/config/sheetBuilderList'
import type { PrintSheetType, SheetType } from '@/features/families/config/printSheets'
import {
  fetchBulkPrintFamilies,
  fetchExecutionSheetFamilies,
  type BulkPrintFamily,
} from '@/features/families/composables/useBulkPrintData'
import { verifyExistingFamilyIds, type LoadedFamilyIds } from '@/features/families/composables/useFamilyGroups'
import { readLastSelection, saveLastSelection } from '@/features/families/composables/useLastSelection'
import { formatDateDMY, formatRelativeArabic } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'

// --- needs filter options (fetched once; not derivable from v_families_list
// the way area/evaluation_status are — see sheetBuilderList.ts) ---
const needsOptions = ref<{ label: string; value: string | null }[]>([{ label: 'الكل', value: null }])

onMounted(async () => {
  const { data } = await supabase.from('need_types').select('code,label_ar').order('sort_order')
  const options = (data ?? [])
    .filter((n) => n.label_ar)
    .map((n) => ({ label: n.label_ar!, value: n.label_ar! }))
  needsOptions.value = [{ label: 'الكل', value: null }, ...options]
})

const config = computed(() => buildSheetBuilderConfig(needsOptions.value))

function familyRowButton(row: Record<string, unknown>) {
  return {
    label: 'عرض',
    icon: 'i-lucide-external-link',
    to: `/families/${row.family_id}`,
    target: '_blank',
  }
}

// --- selection (persists across filter/page changes — lives here, not in
// the grid, so filtering never touches it) ---
const dashboardView = ref<InstanceType<typeof DashboardView> | null>(null)
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

const skippedMessage = ref('')

function setSkipped(skippedCount: number) {
  skippedMessage.value =
    skippedCount === 0
      ? ''
      : skippedCount === 1
        ? 'تم تخطي أسرة واحدة (محذوفة)'
        : `تم تخطي ${skippedCount} أسر (محذوفة)`
}

// --- replace-not-merge, confirmed when a selection is already in progress ---
const confirmReplaceOpen = ref(false)
const pendingIds = ref<number[] | null>(null)

function replaceSelection(ids: number[]) {
  if (selectedIds.value.size > 0) {
    pendingIds.value = ids
    confirmReplaceOpen.value = true
  } else {
    selectedIds.value = new Set(ids)
  }
}

function confirmReplace() {
  if (pendingIds.value) selectedIds.value = new Set(pendingIds.value)
  pendingIds.value = null
  confirmReplaceOpen.value = false
}

// --- saved groups (shared — every families.sheets holder sees all of them) ---
const saveGroupOpen = ref(false)
const loadGroupOpen = ref(false)

function onGroupLoaded(result: LoadedFamilyIds) {
  setSkipped(result.skippedCount)
  replaceSelection(result.familyIds)
}

// --- restore last selection (local to this browser, explicit only) ---
const lastSelection = ref(readLastSelection())
const lastSelectionLabel = computed(() =>
  lastSelection.value ? `استرجاع آخر تحديد (${formatRelativeArabic(lastSelection.value.savedAt)})` : '',
)

async function restoreLastSelection() {
  if (!lastSelection.value) return
  const result = await verifyExistingFamilyIds(lastSelection.value.familyIds)
  setSkipped(result.skippedCount)
  replaceSelection(result.familyIds)
}

// --- handoff to the existing sheet-generation flow, unchanged ---
const pickerOpen = ref(false)
const bulkPrintFamilies = ref<BulkPrintFamily[]>([])
const bulkSheetType = ref<PrintSheetType | null>(null)
const bulkPrinting = ref(false)

async function printSheet(sheetType: PrintSheetType) {
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
}

// شيت تنفيذ is a plain CSV export, not a printed page — no MonthlySheet
// involved, just a client-side file download.
async function downloadExecutionSheet(sheetType: SheetType, ids: number[]) {
  const families = await fetchExecutionSheetFamilies(ids)
  const headers = ['المنطقة', 'اسم رب الأسرة', 'رقم الهاتف', 'اسم الزوج/الزوجة', 'عدد الأفراد', 'تم']
  const rows = families.map((f) => [f.area, f.headName, f.headPhone, f.spouseName, f.memberCount ?? '', ''])
  downloadCsv(`${sheetType.name} ${formatDateDMY(new Date()).replace(/\//g, '-')}.csv`, headers, rows)
}

async function onSheetTypeConfirmed(sheetType: SheetType) {
  bulkPrinting.value = true
  try {
    const ids = Array.from(selectedIds.value) as number[]

    if (sheetType.kind === 'csv') {
      await downloadExecutionSheet(sheetType, ids)
    } else {
      bulkPrintFamilies.value = await fetchBulkPrintFamilies(ids)
      await printSheet(sheetType)
    }

    saveLastSelection(ids)
    lastSelection.value = readLastSelection()
  } finally {
    bulkPrinting.value = false
  }
}

// --- blank sheet download — one empty page, no selection involved. Only
// print-page types are offered here (see PrintSheetPickerModal's `blank`
// prop), so the csv branch is unreachable but kept as a guard, not an
// assumption. ---
const blankPickerOpen = ref(false)

async function onBlankSheetTypeConfirmed(sheetType: SheetType) {
  if (sheetType.kind !== 'print') return
  bulkPrintFamilies.value = []
  await printSheet(sheetType)
}
</script>

<template>
  <div class="print:hidden space-y-4">
    <h1 class="text-2xl font-semibold">بناء شيت</h1>

    <div class="flex flex-wrap items-center gap-3">
      <UButton label="تحديد الكل" variant="soft" color="neutral" icon="i-lucide-check-check" @click="selectAllMatching" />
      <UButton v-if="selectedIds.size > 0" label="إلغاء التحديد" variant="ghost" color="neutral" @click="clearSelection" />
      <span v-if="selectedIds.size > 0" class="text-dimmed text-sm">تم تحديد {{ selectedIds.size }} أسرة</span>

      <UButton
        label="حفظ كمجموعة"
        icon="i-lucide-save"
        variant="soft"
        :disabled="selectedIds.size === 0"
        @click="saveGroupOpen = true"
      />
      <UButton label="تحميل مجموعة" icon="i-lucide-folder-open" variant="soft" @click="loadGroupOpen = true" />
      <UButton
        v-if="lastSelection"
        :label="lastSelectionLabel"
        icon="i-lucide-history"
        variant="ghost"
        color="neutral"
        @click="restoreLastSelection"
      />

      <UButton
        v-if="selectedIds.size > 0"
        label="بناء شيت"
        icon="i-lucide-printer"
        :loading="bulkPrinting"
        @click="pickerOpen = true"
      />

      <UButton
        label="تحميل شيت فارغ"
        icon="i-lucide-file-down"
        variant="ghost"
        color="neutral"
        @click="blankPickerOpen = true"
      />
    </div>

    <UAlert
      v-if="skippedMessage"
      color="warning"
      variant="subtle"
      :title="skippedMessage"
      icon="i-lucide-alert-triangle"
      class="w-fit"
    />

    <DashboardView
      ref="dashboardView"
      :config="config"
      :row-button="familyRowButton"
      selectable
      row-key="family_id"
      :selected-ids="selectedIds"
      @toggle-row="toggleRow"
      @row-click="(row) => toggleRow(row.family_id)"
    />

    <SaveFamilyGroupModal v-model:open="saveGroupOpen" :family-ids="(Array.from(selectedIds) as number[])" />

    <LoadFamilyGroupModal v-model:open="loadGroupOpen" @loaded="onGroupLoaded" />

    <PrintSheetPickerModal v-model:open="pickerOpen" :selected-count="selectedIds.size" @confirm="onSheetTypeConfirmed" />

    <PrintSheetPickerModal v-model:open="blankPickerOpen" :selected-count="0" blank @confirm="onBlankSheetTypeConfirmed" />

    <UModal v-model:open="confirmReplaceOpen" title="استبدال التحديد الحالي؟" class="z-50">
      <template #body>
        <p class="text-sm">عندك {{ selectedIds.size }} أسرة متحددة دلوقتي. التحديد الجديد هيستبدلها بالكامل، مش هيضاف ليها.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="إلغاء" variant="ghost" color="neutral" @click="confirmReplaceOpen = false" />
          <UButton label="استبدال" color="warning" @click="confirmReplace" />
        </div>
      </template>
    </UModal>
  </div>

  <MonthlySheet
    v-if="bulkSheetType"
    class="hidden print:block"
    :families="bulkPrintFamilies"
    :rows-per-page="bulkSheetType.rowsPerPage"
    :amount-label="bulkSheetType.amountLabel"
  />
</template>
