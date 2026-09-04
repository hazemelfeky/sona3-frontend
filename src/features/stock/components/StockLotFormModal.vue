<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStore } from '@/store'
import {
  createLot,
  updateLot,
  type StockBalanceRow,
  type StockLotPayload,
} from '@/features/stock/composables/useStock'
import { toUserMessage } from '@/utils/errors'

const props = defineProps<{
  // null = add, a row = edit that lot prefilled.
  lot: StockBalanceRow | null
}>()
const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })

const store = useStore()
const toast = useToast()

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// unit_price/quantity_in are declared loosely on purpose: UInput with
// type="number" writes a number back, while '' is the empty state.
interface LotFormState {
  name: string
  unit_price: string | number
  quantity_in: string | number
  received_at: string
  note: string
  inKind: boolean
}

function blankForm(): LotFormState {
  return {
    name: '',
    unit_price: '',
    quantity_in: '',
    received_at: today(),
    note: '',
    inKind: false,
  }
}

const form = ref(blankForm())
const imageFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const isEdit = computed(() => props.lot !== null)

// Reset (or prefill) each time the modal opens, never while it's closing.
watch(open, (value) => {
  if (!value) return
  errorMessage.value = ''
  imageFile.value = null
  if (fileInput.value) fileInput.value.value = ''

  const lot = props.lot
  form.value = lot
    ? {
        name: lot.name ?? '',
        unit_price: lot.unit_price === null ? '' : String(lot.unit_price),
        quantity_in: String(lot.quantity_in ?? ''),
        received_at: lot.received_at ?? today(),
        note: lot.note ?? '',
        // A null price is exactly what "تبرع عيني" means in the data.
        inKind: lot.unit_price === null,
      }
    : blankForm()
})

// Ticking in-kind clears whatever price was typed, so the two can't disagree.
watch(
  () => form.value.inKind,
  (inKind) => {
    if (inKind) form.value.unit_price = ''
  },
)

const quantity = computed(() => Number(form.value.quantity_in))
const canSave = computed(
  () =>
    form.value.name.trim().length > 0 &&
    Number.isInteger(quantity.value) &&
    quantity.value > 0 &&
    !saving.value,
)

function onFilePicked(e: Event) {
  imageFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function onSubmit() {
  if (!canSave.value || !store.userId) return
  saving.value = true
  errorMessage.value = ''
  try {
    const payload: StockLotPayload = {
      name: form.value.name.trim(),
      unit_price:
        form.value.inKind || String(form.value.unit_price).trim() === ''
          ? null
          : Number(form.value.unit_price),
      quantity_in: quantity.value,
      received_at: form.value.received_at,
      note: form.value.note.trim() || null,
    }

    if (props.lot) {
      await updateLot(props.lot.lot_id, payload, imageFile.value, props.lot.image_path)
      toast.add({ title: 'تم تعديل المنتج', color: 'success', icon: 'i-lucide-check-circle' })
    } else {
      await createLot(payload, store.userId, imageFile.value)
      toast.add({ title: 'تم حفظ المنتج', color: 'success', icon: 'i-lucide-check-circle' })
    }
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
  <UModal v-model:open="open" :title="isEdit ? 'تعديل المنتج' : 'إضافة منتج'">
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField label="اسم المنتج" required>
          <UInput v-model="form.name" icon="i-lucide-package" class="w-full" />
        </UFormField>

        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="الكمية" required>
            <UInput v-model="form.quantity_in" type="number" min="1" step="1" class="w-full" />
          </UFormField>

          <UFormField label="تاريخ الإضافة" required>
            <UInput
              v-model="form.received_at"
              type="date"
              icon="i-lucide-calendar"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="السعر">
          <UInput
            v-model="form.unit_price"
            type="number"
            min="0"
            step="0.01"
            :disabled="form.inKind"
            :placeholder="form.inKind ? 'تبرع عيني' : ''"
            class="w-full"
          />
        </UFormField>

        <UCheckbox v-model="form.inKind" label="تبرع عيني بدون قيمة" />

        <UFormField label="ملاحظة">
          <UTextarea
            v-model="form.note"
            :rows="3"
            autoresize
            placeholder="محتويات الكرتونة مثلاً"
            class="w-full"
          />
        </UFormField>

        <UFormField label="صورة المنتج">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm"
            @change="onFilePicked"
          />
          <p v-if="isEdit && lot?.image_path && !imageFile" class="mt-1 text-xs text-dimmed">
            في صورة محفوظة. اختر صورة جديدة لو عايز تغيّرها.
          </p>
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
          icon="i-lucide-alert-circle"
        />
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="إلغاء"
          variant="ghost"
          color="neutral"
          :disabled="saving"
          @click="open = false"
        />
        <UButton label="حفظ" :loading="saving" :disabled="!canSave" @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
