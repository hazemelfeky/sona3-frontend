<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFamilyDetail } from '@/composables/useFamilyDetail'
import FamilyDetail from '@/components/dashboard/FamilyDetail.vue'

const route = useRoute()

const familyId = computed(() => Number((route.params as Record<string, string>).id))
const isValidId = computed(() => Number.isInteger(familyId.value) && familyId.value > 0)

const { family, members, income, expenses, needs, loading, error } = useFamilyDetail(familyId)
</script>

<template>
  <div class="space-y-4">
    <UButton
      to="/dashboards/families"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع لقائمة الأسر"
    />

    <div v-if="!isValidId" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">معرف الأسرة غير صالح</p>
    </div>

    <template v-else-if="loading">
      <USkeleton class="h-6 w-48" />
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
    </template>

    <UAlert v-else-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />

    <div v-else-if="!family" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <UIcon name="i-lucide-user-x" class="text-dimmed size-10" />
      <p class="text-lg font-medium">لم يتم العثور على هذه الأسرة</p>
    </div>

    <FamilyDetail v-else :family="family" :members="members" :income="income" :expenses="expenses" :needs="needs" />
  </div>
</template>
