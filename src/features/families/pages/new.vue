<route lang="yaml">
meta:
  requiresPerm: families.create
</route>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { emptyFamilyForm, formToPayload } from '@/features/families/composables/useFamilyForm'
import { createFamily, saveFamilyMembers, saveFamilyNeeds } from '@/features/families/composables/useFamilyMutations'
import { useNeedTypesCatalog } from '@/features/families/composables/useNeedTypesCatalog'
import FamilyForm from '@/components/dashboard/FamilyForm.vue'

const router = useRouter()
const { needTypes } = useNeedTypesCatalog()

const form = ref(emptyFamilyForm())
const saving = ref(false)
const errorMessage = ref('')

const canSave = computed(() => form.value.head_name.trim().length > 0 && !saving.value)

async function onSubmit() {
  if (!canSave.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const id = await createFamily(formToPayload(form.value))
    if (form.value.members.length) await saveFamilyMembers(id, form.value.members)
    const allNeedCodes = needTypes.value.map((n) => n.code)
    if (allNeedCodes.length || form.value.otherNeedNote.trim()) {
      await saveFamilyNeeds(id, allNeedCodes, form.value.needStatus, form.value.otherNeedNote)
    }
    router.push(`/families/${id}`)
  } catch (e) {
    // Hiding the "إضافة أسرة" button for users without families.create is
    // UX only — RLS is the real gate, so a rejected insert still surfaces
    // here rather than failing silently.
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <UButton
      to="/dashboards/families"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع لقائمة الأسر"
    />

    <h1 class="text-2xl font-semibold">إضافة أسرة</h1>

    <FamilyForm v-model="form" />

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" icon="i-lucide-alert-circle" />

    <div class="flex justify-end gap-2">
      <UButton label="حفظ الأسرة" :loading="saving" :disabled="!canSave" @click="onSubmit" />
    </div>
  </div>
</template>
