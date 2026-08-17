<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { dashboards } from '@/config/dashboards'
import { useStore } from '@/store'
import DashboardView from '@/components/list-page/DashboardView.vue'
import DeleteFamilyModal from '@/components/DeleteFamilyModal.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const slug = computed(() => String((route.params as Record<string, string>).slug))
const config = computed(() => dashboards[slug.value])

// The one sanctioned domain-specific block — see dashboard plan §4. Every
// other dashboard page will need its own such wiring for its own detail
// route and row actions.
function onRowClick(row: Record<string, unknown>) {
  if (slug.value === 'families') router.push(`/families/${row.family_id}`)
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
  <div v-if="!config" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
    <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
    <p class="text-lg font-medium">الصفحة غير موجودة</p>
    <p class="text-dimmed text-sm">لا توجد لوحة بيانات بهذا الاسم</p>
  </div>

  <template v-else>
    <DashboardView
      ref="dashboardView"
      :key="slug"
      :config="config"
      :row-actions="slug === 'families' ? familyRowActions : undefined"
      @row-click="onRowClick"
    >
      <template v-if="slug === 'families' && store.hasPerm('families.create')" #actions>
        <UButton to="/families/new" icon="i-lucide-plus" label="إضافة أسرة" />
      </template>
    </DashboardView>

    <DeleteFamilyModal
      v-if="slug === 'families'"
      v-model:open="deleteModalOpen"
      :family-id="deleteTarget?.id ?? null"
      :family-name="deleteTarget?.name ?? null"
      @deleted="onFamilyDeleted"
    />
  </template>
</template>
