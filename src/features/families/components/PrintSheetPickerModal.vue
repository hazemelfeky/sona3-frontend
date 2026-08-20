<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { allSheetTypes, printSheetTypes, type SheetType } from '@/features/families/config/printSheets'

const props = withDefaults(
  defineProps<{
    selectedCount: number
    // Blank mode skips the "N families" framing — used for the empty
    // downloadable sheet, which has no selection behind it at all. CSV
    // sheets don't apply there (nothing to print blank), so it also
    // narrows the picker to print-page types only.
    blank?: boolean
  }>(),
  { blank: false },
)
const emit = defineEmits<{ confirm: [sheetType: SheetType] }>()

const open = defineModel<boolean>('open', { required: true })

const types = computed(() => (props.blank ? printSheetTypes : allSheetTypes))
const items = computed(() => types.value.map((s) => ({ label: s.name, value: s.id })))
const selectedId = ref(types.value[0]?.id ?? '')

watch(open, (value) => {
  if (value) selectedId.value = types.value[0]?.id ?? ''
})

const selectedType = computed(() => types.value.find((s) => s.id === selectedId.value))

const description = computed(() => {
  if (props.blank) return 'هيتطبع شيت فارغ (صفحة واحدة) تقدر تملاها يدويًا'
  if (selectedType.value?.kind === 'csv') return `هيتم تحميل ملف CSV لـ ${props.selectedCount} أسرة محددة`
  return `هيتطبع شيت لـ ${props.selectedCount} أسرة محددة`
})

function onConfirm() {
  if (!selectedType.value) return
  open.value = false
  emit('confirm', selectedType.value)
}
</script>

<template>
  <UModal v-model:open="open" title="اختيار نوع الشيت" class="z-50">
    <template #body>
      <p class="text-dimmed mb-3 text-sm">{{ description }}</p>

      <URadioGroup v-model="selectedId" :items="items" />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" @click="open = false" />
        <UButton
          :label="selectedType?.kind === 'csv' ? 'تحميل' : 'طباعة'"
          :icon="selectedType?.kind === 'csv' ? 'i-lucide-download' : 'i-lucide-printer'"
          :disabled="!selectedId"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
