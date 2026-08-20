<script setup lang="ts">
import { ref, watch } from 'vue'
import { printSheetTypes, type PrintSheetType } from '@/features/families/config/printSheets'

const props = defineProps<{
  selectedCount: number
}>()
const emit = defineEmits<{ confirm: [sheetType: PrintSheetType] }>()

const open = defineModel<boolean>('open', { required: true })

const items = printSheetTypes.map((s) => ({ label: s.name, value: s.id }))
const selectedId = ref(printSheetTypes[0]?.id ?? '')

watch(open, (value) => {
  if (value) selectedId.value = printSheetTypes[0]?.id ?? ''
})

function onConfirm() {
  const sheetType = printSheetTypes.find((s) => s.id === selectedId.value)
  if (!sheetType) return
  open.value = false
  emit('confirm', sheetType)
}
</script>

<template>
  <UModal v-model:open="open" title="اختيار نوع الشيت" class="z-50">
    <template #body>
      <p class="text-dimmed mb-3 text-sm">هيتطبع شيت لـ {{ props.selectedCount }} أسرة محددة</p>

      <URadioGroup v-model="selectedId" :items="items" />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" @click="open = false" />
        <UButton label="طباعة" icon="i-lucide-printer" :disabled="!selectedId" @click="onConfirm" />
      </div>
    </template>
  </UModal>
</template>
