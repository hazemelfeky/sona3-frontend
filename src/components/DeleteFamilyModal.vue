<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, watch } from 'vue'
import { deleteFamily } from '@/features/families/composables/useFamilyMutations'

const props = defineProps<{
  familyId: number | null
  familyName: string | null
}>()
const emit = defineEmits<{ deleted: [id: number] }>()

const open = defineModel<boolean>('open', { required: true })

const deleting = ref(false)
const errorMessage = ref('')

// Reset feedback state each time the modal is (re)opened for a new target.
watch(open, (value) => {
  if (value) errorMessage.value = ''
})

async function onConfirm() {
  if (props.familyId === null) return
  deleting.value = true
  errorMessage.value = ''
  try {
    await deleteFamily(props.familyId)
    open.value = false
    emit('deleted', props.familyId)
  } catch (e) {
    // Hiding the delete action for users without families.delete is UX
    // only — RLS is the real gate, so a rejected delete still surfaces
    // here rather than failing silently.
    errorMessage.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="مسح الأسرة" class="z-50">
    <template #body>
      <p class="text-sm">
        هتمسح بيانات
        <span class="font-semibold">{{ familyName || 'الأسرة دي' }}</span>
        نهائيًا، وده إجراء لا رجعة فيه.
      </p>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
        class="mt-4"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" :disabled="deleting" @click="open = false" />
        <UButton label="مسح نهائيًا" color="error" :loading="deleting" @click="onConfirm" />
      </div>
    </template>
  </UModal>
</template>
