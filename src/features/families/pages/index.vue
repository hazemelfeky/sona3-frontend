<route lang="yaml">
meta:
  requiresPerm: families.view
</route>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useStore } from '@/store'
import DashboardView from '@/components/list-page/DashboardView.vue'
import DeleteFamilyModal from '@/components/DeleteFamilyModal.vue'
import { familiesListConfig } from '@/features/families/config/list'

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
</script>

<template>
  <DashboardView
    ref="dashboardView"
    :config="familiesListConfig"
    :row-actions="familyRowActions"
    @row-click="onRowClick"
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
</template>
