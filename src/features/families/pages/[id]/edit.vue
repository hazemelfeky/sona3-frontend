<route lang="yaml">
meta:
  requiresPerm: families.edit
</route>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFamilyDetail } from '@/composables/useFamilyDetail'
import { emptyFamilyForm, familyToForm, formToPayload } from '@/features/families/composables/useFamilyForm'
import {
  updateFamily,
  saveFamilyMembers,
  saveFamilyNeeds,
  type OriginalNeed,
} from '@/features/families/composables/useFamilyMutations'
import { useNeedTypesCatalog } from '@/features/families/composables/useNeedTypesCatalog'
import FamilyForm from '@/features/families/components/FamilyForm.vue'

const route = useRoute()
const router = useRouter()
const { needTypes } = useNeedTypesCatalog()

const familyId = computed(() => Number((route.params as Record<string, string>).id))
const isValidId = computed(() => Number.isInteger(familyId.value) && familyId.value > 0)

const { family, members, needs, loading, error: loadError } = useFamilyDetail(familyId)

const form = ref(emptyFamilyForm())
// Snapshots as of the last load — diffed against the form's members/needs
// on submit so rows removed in the UI are actually deleted, not just
// dropped from the form.
const originalMemberIds = ref<number[]>([])
const originalNeeds = ref<OriginalNeed[]>([])

watch(
  family,
  (row) => {
    if (!row) return
    form.value = familyToForm(row, members.value, needs.value)
    originalMemberIds.value = members.value.map((m) => m.member_id)
    originalNeeds.value = needs.value.map((n) => ({
      need_id: n.need_id,
      need_code: n.need_code,
      family_id: n.family_id,
      source: n.source,
      note: n.note,
    }))
  },
  { immediate: true },
)

const saving = ref(false)
const saveError = ref('')
const canSave = computed(() => form.value.head_name.trim().length > 0 && !saving.value)

async function onSubmit() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    await updateFamily(familyId.value, formToPayload(form.value))
    await saveFamilyMembers(familyId.value, form.value.members, originalMemberIds.value)
    const allNeedCodes = needTypes.value.map((n) => n.code)
    await saveFamilyNeeds(
      familyId.value,
      allNeedCodes,
      form.value.needStatus,
      form.value.otherNeedNote,
      originalNeeds.value,
    )
    router.push(`/families/${familyId.value}`)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <UButton
      :to="isValidId ? `/families/${familyId}` : '/families'"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع لبيانات الأسرة"
    />

    <div v-if="!isValidId" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">معرف الأسرة غير صالح</p>
    </div>

    <template v-else-if="loading">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-64 w-full" />
    </template>

    <UAlert v-else-if="loadError" color="error" variant="subtle" :title="loadError" icon="i-lucide-alert-circle" />

    <div v-else-if="!family" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <UIcon name="i-lucide-user-x" class="text-dimmed size-10" />
      <p class="text-lg font-medium">لم يتم العثور على هذه الأسرة</p>
    </div>

    <template v-else>
      <h1 class="text-2xl font-semibold">تعديل بيانات الأسرة</h1>

      <FamilyForm v-model="form" />

      <UAlert v-if="saveError" color="error" variant="subtle" :title="saveError" icon="i-lucide-alert-circle" />

      <div class="flex justify-end gap-2">
        <UButton label="حفظ التعديلات" :loading="saving" :disabled="!canSave" @click="onSubmit" />
      </div>
    </template>
  </div>
</template>
