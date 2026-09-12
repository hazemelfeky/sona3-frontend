<route lang="yaml">
meta:
  requiresPerm:
    - operations.view
    - operations.manage
</route>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import type { CardDef, FilterDef } from '@/components/list-page/types'
import FilterBar from '@/components/list-page/FilterBar.vue'
import StatCards from '@/components/list-page/StatCards.vue'
import { useVolunteerOptions } from '@/features/aid/composables/useAid'
import { useAidList, deleteAid, type AidListRow } from '@/features/aid/composables/useAidList'
import { formatNumber, formatDateDMY } from '@/utils/format'
import { toUserMessage } from '@/utils/errors'

const router = useRouter()
const store = useStore()
const toast = useToast()

const { rows, aidsByVolunteer, loading, error, refresh } = useAidList()
const { options: volunteerOptions } = useVolunteerOptions()

const canManage = () => store.hasPerm('operations.manage')

/* ---- filters ---- */

const search = ref('')
const filterValues = ref<Record<string, unknown>>({})

const filters = computed<FilterDef[]>(() => [
  // FilterBar renders a dateRange as [from] label [to], so the label is the
  // word that sits between the two boxes.
  { key: 'date', label: 'إلى', type: 'dateRange' },
  {
    key: 'volunteer',
    label: 'المتطوع',
    type: 'select',
    options: volunteerOptions.value.map((v) => ({ label: v.label, value: v.user_id })),
  },
  // No options — FilterBar derives the areas actually present in v_aid_list.
  { key: 'family_area', label: 'المنطقة', type: 'select' },
  {
    key: 'item_kind',
    label: 'نوع البند',
    type: 'select',
    options: [
      { label: 'الكل', value: null },
      { label: 'عيني', value: 'inventory' },
      { label: 'مالي', value: 'cash' },
    ],
  },
])

// aid_date can arrive as a bare date or a timestamp; comparing the date part
// keeps a same-day "إلى" bound from excluding the day it names.
const dayOf = (value: string | null) => value?.slice(0, 10) ?? ''

const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const values = filterValues.value

    const range = values.date as { from?: string; to?: string } | undefined
    const day = dayOf(row.aid_date)
    if (range?.from && (!day || day < range.from)) return false
    if (range?.to && (!day || day > range.to)) return false

    const volunteer = values.volunteer as string | null | undefined
    if (volunteer && !aidsByVolunteer.value.get(volunteer)?.has(row.aid_id)) return false

    const area = values.family_area
    if (area && row.family_area !== area) return false

    const kind = values.item_kind
    if (kind === 'inventory' && !row.has_inventory) return false
    if (kind === 'cash' && !row.has_cash) return false

    const query = search.value.trim()
    if (query && !(row.family_head ?? '').includes(query)) return false

    return true
  }),
)

/* ---- stats: computed from the filtered rows, never the whole table ---- */

const statCards: CardDef[] = [
  { key: 'families', label: 'عدد المستفيدين', format: 'number', icon: 'i-lucide-home' },
  { key: 'items', label: 'عدد المساعدات', format: 'number', icon: 'i-lucide-package' },
  // Pre-formatted so the "ج" rides along — formatValue leaves a string as is.
  { key: 'value', label: 'إجمالي القيمة', icon: 'i-lucide-coins', color: 'success' },
  // The split matters: a month heavy on عيني reads the same as a cash month
  // on the total alone.
  { key: 'cash', label: 'منها نقدي', icon: 'i-lucide-banknote', color: 'info' },
]

const sumOf = (key: 'total_cash' | 'total_value') =>
  filteredRows.value.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)

const stats = computed(() => ({
  families: new Set(filteredRows.value.map((row) => row.family_id)).size,
  items: filteredRows.value.reduce((sum, row) => sum + Number(row.items_count ?? 0), 0),
  value: `${formatNumber(sumOf('total_value'))} ج`,
  cash: `${formatNumber(sumOf('total_cash'))} ج`,
}))

/* ---- table ---- */

// A visit that handed over money reads green, a purely in-kind one blue —
// the same two-tone signal the stock list uses.
const rowClass = (row: { original: AidListRow }) =>
  row.original.has_cash
    ? 'bg-green-50/70 dark:bg-green-950/30'
    : 'bg-blue-50/70 dark:bg-blue-950/30'

// A zero here is genuinely nothing — an aid with no cash, or one made up of
// unpriced تبرع عيني — so it reads as a dash rather than "0 ج".
const moneyLabel = (value: number) => (Number(value ?? 0) === 0 ? '—' : `${formatNumber(value)} ج`)

function openAid(row: AidListRow) {
  router.push(`/aid/${row.aid_id}`)
}
function openFamily(row: AidListRow) {
  router.push(`/families/${row.family_id}`)
}
function openEdit(row: AidListRow) {
  router.push(`/families/${row.family_id}/aid/${row.aid_id}/edit?from=/aid`)
}

/* ---- delete ---- */

const deleteOpen = ref(false)
const deleteTarget = ref<AidListRow | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function openDelete(row: AidListRow) {
  deleteTarget.value = row
  deleteError.value = ''
  deleteOpen.value = true
}

async function onConfirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAid(deleteTarget.value.aid_id)
    deleteOpen.value = false
    await refresh()
    toast.add({ title: 'تم حذف التنفيذ', color: 'success', icon: 'i-lucide-check-circle' })
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
      <h1 class="text-2xl font-semibold">التنفيذات</h1>
      <UButton
        v-if="canManage()"
        to="/stock"
        icon="i-lucide-package-check"
        label="توزيع جماعي من منتج"
        variant="soft"
        color="neutral"
      />
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
      <StatCards :cards="statCards" :stats="stats" :loading="loading" :error="null" />

      <FilterBar
        v-model:search="search"
        v-model:values="filterValues"
        :filters="filters"
        source="v_aid_list"
      />

      <template v-if="loading">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </template>

      <template v-else>
        <p class="text-muted text-sm">عرض {{ filteredRows.length }} من {{ rows.length }}</p>

        <UTable
          :data="filteredRows"
          :ui="{ tr: 'cursor-pointer' }"
          :meta="{ class: { tr: rowClass } }"
          :columns="[
            { accessorKey: 'family_head', header: 'الأسرة' },
            { accessorKey: 'aid_date', header: 'التاريخ' },
            { accessorKey: 'volunteers_names', header: 'المتطوعون' },
            { accessorKey: 'items_summary', header: 'المساعدات' },
            { accessorKey: 'total_cash', header: 'نقدي' },
            { accessorKey: 'total_inventory_value', header: 'قيمة عينية' },
            { accessorKey: 'total_value', header: 'الإجمالي' },
            { id: 'actions', header: '' },
          ]"
          @select="(_e: Event, row: { original: AidListRow }) => openAid(row.original)"
        >
          <!-- The row opens the execution; the family name is the way through
               to the family itself. -->
          <template #family_head-cell="{ row }">
            <div class="min-w-0" @click.stop="openFamily(row.original)">
              <p class="truncate font-medium hover:underline">
                {{ row.original.family_head || '—' }}
              </p>
              <p v-if="row.original.family_area" class="text-dimmed truncate text-xs">
                {{ row.original.family_area }}
              </p>
            </div>
          </template>

          <template #aid_date-cell="{ row }">{{ formatDateDMY(row.original.aid_date) }}</template>

          <template #volunteers_names-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <span
                class="block max-w-56 truncate"
                :title="row.original.volunteers_names ?? undefined"
              >
                {{ row.original.volunteers_names || '—' }}
              </span>
              <UBadge
                v-if="row.original.volunteers_count > 1"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ formatNumber(row.original.volunteers_count) }}
              </UBadge>
            </div>
          </template>

          <template #items_summary-cell="{ row }">
            <span class="block max-w-96 truncate" :title="row.original.items_summary ?? undefined">
              {{ row.original.items_summary || '—' }}
            </span>
          </template>

          <template #total_cash-cell="{ row }">
            {{ moneyLabel(row.original.total_cash) }}
          </template>

          <template #total_inventory_value-cell="{ row }">
            {{ moneyLabel(row.original.total_inventory_value) }}
          </template>

          <template #total_value-cell="{ row }">
            <span class="font-medium">{{ moneyLabel(row.original.total_value) }}</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1" @click.stop>
              <UButton
                icon="i-lucide-eye"
                size="sm"
                color="neutral"
                variant="ghost"
                aria-label="تفاصيل"
                @click="openAid(row.original)"
              />
              <template v-if="canManage()">
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
              </template>
            </div>
          </template>
        </UTable>

        <p v-if="!filteredRows.length" class="text-dimmed text-center py-12">
          {{ rows.length ? 'مفيش تنفيذات مطابقة للفلاتر' : 'لسه مفيش تنفيذات مسجلة' }}
        </p>
      </template>
    </template>

    <UModal v-model:open="deleteOpen" title="حذف التنفيذ؟ هيرجع المخزون المستهلك.">
      <template #body>
        <p class="text-sm">
          هتمسح تنفيذ
          <span class="font-semibold">{{ deleteTarget?.family_head || 'الأسرة دي' }}</span>
          بتاريخ {{ formatDateDMY(deleteTarget?.aid_date) }} نهائيًا، ومعاه المساعدات والمتطوعين
          والصور المرتبطة بيه. وده إجراء لا رجعة فيه.
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
