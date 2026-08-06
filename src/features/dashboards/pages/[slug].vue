<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dashboards } from '@/config/dashboards'
import DashboardView from '@/components/dashboard/DashboardView.vue'

const route = useRoute()
const router = useRouter()
const slug = computed(() => String((route.params as Record<string, string>).slug))
const config = computed(() => dashboards[slug.value])

// The one sanctioned domain-specific line — see dashboard plan §4. Every
// other dashboard page will need its own such wiring for its own detail route.
function onRowClick(row: Record<string, unknown>) {
  if (slug.value === 'families') router.push(`/families/${row.family_id}`)
}
</script>

<template>
  <div v-if="!config" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
    <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
    <p class="text-lg font-medium">الصفحة غير موجودة</p>
    <p class="text-dimmed text-sm">لا توجد لوحة بيانات بهذا الاسم</p>
  </div>

  <DashboardView v-else :key="slug" :config="config" @row-click="onRowClick" />
</template>
