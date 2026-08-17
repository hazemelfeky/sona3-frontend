<route lang="yaml">
meta:
  requiresPerm: families.view
</route>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '@/store'
import { useFamilyDetail } from '@/composables/useFamilyDetail'
import FamilyDetail from '@/components/dashboard/FamilyDetail.vue'
import DeleteFamilyModal from '@/components/dashboard/DeleteFamilyModal.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const familyId = computed(() => Number((route.params as Record<string, string>).id))
const isValidId = computed(() => Number.isInteger(familyId.value) && familyId.value > 0)

const { family, members, income, expenses, needs, loading, error } = useFamilyDetail(familyId)

const deleteModalOpen = ref(false)

function onFamilyDeleted() {
  router.push('/dashboards/families')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <UButton
        to="/dashboards/families"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-right"
        label="رجوع لقائمة الأسر"
      />

      <div v-if="family" class="flex gap-2">
        <UButton
          v-if="store.hasPerm('families.edit')"
          :to="`/families/${familyId}/edit`"
          variant="soft"
          color="neutral"
          icon="i-lucide-pencil"
          label="تعديل"
        />
        <UButton
          v-if="store.hasPerm('families.delete')"
          variant="soft"
          color="error"
          icon="i-lucide-trash-2"
          label="مسح"
          @click="deleteModalOpen = true"
        />
      </div>
    </div>

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

    <DeleteFamilyModal
      v-model:open="deleteModalOpen"
      :family-id="family?.family_id ?? null"
      :family-name="family?.head_name ?? null"
      @deleted="onFamilyDeleted"
    />
  </div>
</template>
