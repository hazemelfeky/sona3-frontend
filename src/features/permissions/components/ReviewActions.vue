<script setup lang="ts">
import { ref } from 'vue'
import { db } from '@/lib/supabase'
import { useStore } from '@/store'

const props = defineProps<{ userId: string; status: 'pending' | 'approved' | 'rejected' }>()
const emit = defineEmits<{ reviewed: [] }>()

const store = useStore()
const adminNote = ref('')
const saving = ref(false)
const actionError = ref('')

function translateActionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (raw.includes('NO_PERMISSION')) return 'مش معاك صلاحية للإجراء ده'
  return 'حصلت مشكلة. حاول تاني.'
}

async function onReview(newStatus: 'approved' | 'rejected') {
  saving.value = true
  actionError.value = ''
  try {
    const { error } = (await db.rpc('review_and_grant', {
      target_user: props.userId,
      new_status: newStatus,
      perm_codes: [],
      note: adminNote.value.trim() || null,
    })) as { error: { message: string } | null }
    if (error) throw error

    if (props.userId === store.userId) await store.refreshSession(store.userId!)
    emit('reviewed')
  } catch (e) {
    actionError.value = translateActionError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard v-if="status === 'pending'">
    <template #header>
      <h2 class="font-semibold">مراجعة العضوية</h2>
    </template>

    <UFormField label="ملاحظة (اختياري)">
      <UTextarea v-model="adminNote" class="w-full" :rows="2" />
    </UFormField>

    <UAlert
      v-if="actionError"
      color="error"
      variant="subtle"
      :title="actionError"
      icon="i-lucide-alert-circle"
      class="mt-4"
    />

    <div class="flex flex-wrap items-center gap-2 mt-4">
      <UButton label="قبول العضو" color="success" :loading="saving" @click="onReview('approved')" />
      <UButton label="رفض العضو" color="error" variant="soft" :loading="saving" @click="onReview('rejected')" />
    </div>
  </UCard>
</template>
