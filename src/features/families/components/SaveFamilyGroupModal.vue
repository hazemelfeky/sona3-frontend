<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, watch } from 'vue'
import { useStore } from '@/store'
import { saveFamilyGroup } from '@/features/families/composables/useFamilyGroups'

const props = defineProps<{
  familyIds: number[]
}>()
const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })

const store = useStore()
const name = ref('')
const saving = ref(false)
const errorMessage = ref('')

watch(open, (value) => {
  if (value) {
    name.value = ''
    errorMessage.value = ''
  }
})

async function onSave() {
  if (!name.value.trim() || !store.userId) return
  saving.value = true
  errorMessage.value = ''
  try {
    await saveFamilyGroup(name.value.trim(), props.familyIds, store.userId)
    open.value = false
    emit('saved')
  } catch (e) {
    errorMessage.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="حفظ كمجموعة" class="z-50">
    <template #body>
      <p class="text-dimmed mb-3 text-sm">هيتم حفظ {{ familyIds.length }} أسرة في مجموعة جديدة</p>
      <UInput v-model="name" placeholder="اسم المجموعة" autofocus @keyup.enter="onSave" />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
        class="mt-3"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" :disabled="saving" @click="open = false" />
        <UButton label="حفظ" icon="i-lucide-save" :loading="saving" :disabled="!name.trim()" @click="onSave" />
      </div>
    </template>
  </UModal>
</template>
