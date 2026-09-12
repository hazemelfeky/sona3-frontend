<route lang="yaml">
meta:
  requiresPerm: families.view
</route>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DashboardConfig } from '@/components/list-page/types'
import { useStore } from '@/store'
import DashboardView from '@/components/list-page/DashboardView.vue'
import DeleteFamilyModal from '@/components/DeleteFamilyModal.vue'
import { familiesListConfig, deferredListColumns } from '@/features/families/config/list'

const route = useRoute()
const router = useRouter()
const store = useStore()

// Same page, same table, one flipped filter — deferred families are normal
// families parked at record_status 'draft'. The mode lives in the query
// string so opening a draft family and coming back doesn't silently drop
// you into the active list.
const isDeferred = computed(() => route.query.status === 'draft')

const listConfig = computed<DashboardConfig>(() => ({
  ...familiesListConfig,
  fixedFilter: {
    ...familiesListConfig.fixedFilter,
    record_status: isDeferred.value ? 'draft' : 'active',
  },
  // Normal mode keeps its columns untouched; deferred swaps in the fields
  // that a capture actually fills.
  columns: isDeferred.value ? deferredListColumns : familiesListConfig.columns,
}))

// Deferred rows get an explicit way through to the family, since finishing
// the research is the whole point of the list. Same destination as the row
// click, just discoverable.
const deferredRowButton = computed(() =>
  isDeferred.value
    ? (row: Record<string, unknown>) => ({
        label: 'افتح / كمّل البحث',
        icon: 'i-lucide-arrow-left',
        to: `/families/${row.family_id}`,
      })
    : undefined,
)

function setDeferred(next: boolean) {
  router.replace({ query: next ? { status: 'draft' } : {} })
}

function onRowClick(row: Record<string, unknown>) {
  router.push(`/families/${row.family_id}`)
}

const dashboardView = ref<InstanceType<typeof DashboardView> | null>(null)
const deleteTarget = ref<{ id: number; name: string | null } | null>(null)
const deleteModalOpen = ref(false)

function familyRowActions(row: Record<string, unknown>): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = []
  if (store.hasPerm('operations.manage')) {
    items.push({
      label: 'تنفيذ',
      icon: 'i-lucide-hand-heart',
      onSelect: () => router.push(`/families/${row.family_id}/aid/new`),
    })
  }
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
        deleteTarget.value = {
          id: row.family_id as number,
          name: (row.head_name as string) ?? null,
        }
        deleteModalOpen.value = true
      },
    })
  }
  return items
}

function onFamilyDeleted() {
  dashboardView.value?.refresh()
}
</script>

<template>
  <div>
    <DashboardView
      ref="dashboardView"
      :key="isDeferred ? 'draft' : 'active'"
      :config="listConfig"
      :row-actions="familyRowActions"
      :row-button="deferredRowButton"
      row-key="family_id"
      @row-click="onRowClick"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            v-if="store.hasPerm('families.sheets')"
            to="/families/sheet-builder"
            icon="i-lucide-file-stack"
            label="بناء شيت"
            variant="soft"
            color="neutral"
          />
          <UButton
            v-if="store.hasPerm('families.create')"
            to="/families/new"
            icon="i-lucide-plus"
            label="إضافة أسرة"
          />
        </div>
      </template>

      <template #afterFilters>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <UBadge v-if="isDeferred" color="warning" variant="subtle" icon="i-lucide-hourglass">
            تعرض: الأسر المؤجلة
          </UBadge>

          <button
            type="button"
            class="text-dimmed hover:text-default hover:underline"
            @click="setDeferred(!isDeferred)"
          >
            {{ isDeferred ? '→ رجوع للأسر العادية' : 'عايز الأسر المؤجلة؟' }}
          </button>
        </div>
      </template>
    </DashboardView>

    <DeleteFamilyModal
      v-model:open="deleteModalOpen"
      :family-id="deleteTarget?.id ?? null"
      :family-name="deleteTarget?.name ?? null"
      @deleted="onFamilyDeleted"
    />
  </div>
</template>
