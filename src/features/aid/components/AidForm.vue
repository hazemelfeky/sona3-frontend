<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import { useFamilyDetail } from '@/composables/useFamilyDetail'
import VolunteerMultiSelect from '@/features/aid/components/VolunteerMultiSelect.vue'
import {
  useAvailableLots,
  createAid,
  updateAid,
  fetchAidForEdit,
  draftNumber,
  uploadAidPhotos,
  type AidItemDraft,
} from '@/features/aid/composables/useAid'
import { formatNumber } from '@/utils/format'
import { toUserMessage } from '@/utils/errors'

// One form for both halves of the workflow: recording a new execution and
// correcting one that already exists. Everything but the initial values and
// the save call is identical, so the two pages are thin wrappers around this.
const props = defineProps<{
  familyId: number
  // null / omitted = create mode.
  aidId?: number | null
  // Where the back button and a successful save land. Defaults to the
  // family's own page, which is where recording a new execution starts from.
  returnTo?: string
}>()

const router = useRouter()
const store = useStore()
const toast = useToast()

const isEdit = computed(() => typeof props.aidId === 'number' && Number.isInteger(props.aidId))
const backTo = computed(() => props.returnTo ?? `/families/${props.familyId}`)

const familyIdRef = computed(() => props.familyId)
const { family, loading: familyLoading } = useFamilyDetail(familyIdRef)
const { lots } = useAvailableLots()

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const aidDate = ref(today())
const note = ref('')
const volunteerIds = ref<string[]>([])
const items = ref<AidItemDraft[]>([{ kind: 'inventory', lot_id: null, quantity: '1' }])
const photoFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

// Quantities the aid being edited already took out of each lot, so the
// overdraw check can credit them back (see AidEditRecord.lotBaseline).
const lotBaseline = ref<Record<number, number>>({})
const loadingAid = ref(false)
const notFound = ref(false)
const loadError = ref('')

async function loadAid() {
  if (!isEdit.value) return
  loadingAid.value = true
  loadError.value = ''
  notFound.value = false
  try {
    const record = await fetchAidForEdit(props.aidId as number)
    if (!record) {
      notFound.value = true
      return
    }
    aidDate.value = record.aid_date?.slice(0, 10) ?? today()
    note.value = record.note ?? ''
    volunteerIds.value = record.volunteerIds
    items.value = record.items
    lotBaseline.value = record.lotBaseline
  } catch (e) {
    loadError.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل التنفيذ')
  } finally {
    loadingAid.value = false
  }
}

watch(() => props.aidId, loadAid, { immediate: true })

function addInventoryItem() {
  items.value.push({ kind: 'inventory', lot_id: null, quantity: '1' })
}
function addCashItem() {
  items.value.push({ kind: 'cash', name: '', amount: '' })
}
function removeItem(index: number) {
  items.value.splice(index, 1)
}

const lotById = computed(() => new Map(lots.value.map((l) => [l.lot_id, l])))

// v_stock_balance only lists lots with stock left, so a lot this aid emptied
// is missing from `lots` entirely — its baseline is all the room there is.
function availableFor(lotId: number) {
  return (lotById.value.get(lotId)?.quantity_left ?? 0) + (lotBaseline.value[lotId] ?? 0)
}

// Several rows can draw on the same lot, so the check is against the total
// taken from each lot, not each row on its own.
const overdrawnLots = computed(() => {
  const wanted = new Map<number, number>()
  for (const item of items.value) {
    if (item.kind !== 'inventory' || item.lot_id === null) continue
    const qty = draftNumber(item.quantity)
    wanted.set(item.lot_id, (wanted.get(item.lot_id) ?? 0) + (Number.isFinite(qty) ? qty : 0))
  }
  return [...wanted.entries()]
    .filter(([lotId, qty]) => qty > availableFor(lotId))
    .map(([lotId, qty]) => ({
      name: lotById.value.get(lotId)?.name ?? '—',
      wanted: qty,
      left: availableFor(lotId),
    }))
})

const itemsValid = computed(() =>
  items.value.every((item) => {
    if (item.kind === 'inventory') {
      const qty = draftNumber(item.quantity)
      return item.lot_id !== null && Number.isInteger(qty) && qty > 0
    }
    const amount = draftNumber(item.amount)
    return item.name.trim().length > 0 && Number.isFinite(amount) && amount >= 0
  }),
)

const saving = ref(false)
const progressLabel = ref('')
const errorMessage = ref('')

const canSubmit = computed(
  () =>
    volunteerIds.value.length > 0 &&
    items.value.length > 0 &&
    itemsValid.value &&
    overdrawnLots.value.length === 0 &&
    !saving.value &&
    !loadingAid.value &&
    !notFound.value,
)

function onFilesPicked(e: Event) {
  photoFiles.value = Array.from((e.target as HTMLInputElement).files ?? [])
}

async function onSubmit() {
  if (!canSubmit.value || !store.userId) return
  saving.value = true
  errorMessage.value = ''
  try {
    let aidId: number
    if (isEdit.value) {
      aidId = props.aidId as number
      await updateAid({
        aidId,
        aidDate: aidDate.value,
        note: note.value.trim() || null,
        items: items.value,
        volunteerIds: volunteerIds.value,
      })
    } else {
      aidId = await createAid({
        familyId: props.familyId,
        aidDate: aidDate.value,
        note: note.value.trim() || null,
        items: items.value,
        volunteerIds: volunteerIds.value,
        createdBy: store.userId,
      })
    }

    if (photoFiles.value.length) {
      progressLabel.value = 'جاري رفع الصور...'
      await uploadAidPhotos(
        props.familyId,
        aidId,
        photoFiles.value,
        store.userId,
        (done, total) => (progressLabel.value = `جاري رفع الصور... ${done} من ${total}`),
      )
    }

    toast.add({
      title: isEdit.value ? 'تم تعديل التنفيذ' : 'تم تسجيل التنفيذ',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    router.push(backTo.value)
  } catch (e) {
    errorMessage.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني')
  } finally {
    saving.value = false
    progressLabel.value = ''
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <UButton
      :to="backTo"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      :label="returnTo ? 'رجوع' : 'رجوع لصفحة الأسرة'"
    />

    <h1 class="text-2xl font-semibold">{{ isEdit ? 'تعديل التنفيذ' : 'تسجيل تنفيذ' }}</h1>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      :title="loadError"
      icon="i-lucide-alert-circle"
      :actions="[
        { label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: loadAid },
      ]"
    />

    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">لم يتم العثور على التنفيذ</p>
    </div>

    <template v-else-if="loadingAid">
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-48 w-full" />
    </template>

    <template v-else>
      <UCard>
        <div class="grid sm:grid-cols-2 gap-4 p-2">
          <UFormField label="الأسرة">
            <USkeleton v-if="familyLoading" class="h-8 w-full" />
            <UInput v-else :model-value="family?.head_name ?? '—'" disabled class="w-full" />
          </UFormField>

          <UFormField label="التاريخ" required>
            <UInput v-model="aidDate" type="date" icon="i-lucide-calendar" class="w-full" />
          </UFormField>

          <div class="sm:col-span-2">
            <VolunteerMultiSelect v-model="volunteerIds" />
          </div>

          <UFormField label="ملاحظة" class="sm:col-span-2">
            <UTextarea v-model="note" :rows="2" autoresize class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-medium">المساعدات</h3>
            <div class="flex gap-2">
              <UButton
                label="إضافة عيني"
                icon="i-lucide-package"
                size="sm"
                variant="soft"
                color="neutral"
                @click="addInventoryItem"
              />
              <UButton
                label="إضافة مالي"
                icon="i-lucide-banknote"
                size="sm"
                variant="soft"
                color="neutral"
                @click="addCashItem"
              />
            </div>
          </div>
        </template>

        <p v-if="!items.length" class="text-dimmed py-4 text-center text-sm">
          ضيف مساعدة واحدة على الأقل
        </p>

        <div v-else class="space-y-3 p-2">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="border-default rounded-lg border p-3"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <UBadge :color="item.kind === 'inventory' ? 'primary' : 'success'" variant="subtle">
                {{ item.kind === 'inventory' ? 'عيني' : 'مالي' }}
              </UBadge>
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                aria-label="حذف"
                @click="removeItem(index)"
              />
            </div>

            <div v-if="item.kind === 'inventory'" class="grid gap-3 sm:grid-cols-2">
              <UFormField label="المنتج" required>
                <USelectMenu
                  v-model="item.lot_id"
                  searchable
                  :items="lots"
                  value-key="lot_id"
                  label-key="name"
                  placeholder="اختر منتج"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="الكمية"
                required
                :hint="
                  item.lot_id !== null
                    ? `متاح ${formatNumber(availableFor(item.lot_id))}`
                    : undefined
                "
              >
                <UInput v-model="item.quantity" type="number" min="1" step="1" class="w-full" />
              </UFormField>
            </div>

            <div v-else class="grid gap-3 sm:grid-cols-2">
              <UFormField label="الاسم" required>
                <UInput v-model="item.name" placeholder="وصلة مياه مثلاً" class="w-full" />
              </UFormField>
              <UFormField label="المبلغ" required>
                <UInput v-model="item.amount" type="number" min="0" step="0.01" class="w-full" />
              </UFormField>
            </div>
          </div>
        </div>

        <UAlert
          v-if="overdrawnLots.length"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="تخطيت الكمية المتاحة"
          class="mt-3"
        >
          <template #description>
            <ul class="list-disc ps-4">
              <li v-for="lot in overdrawnLots" :key="lot.name">
                {{ lot.name }}: طلبت {{ formatNumber(lot.wanted) }} والمتاح
                {{ formatNumber(lot.left) }}
              </li>
            </ul>
          </template>
        </UAlert>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-medium">{{ isEdit ? 'إضافة صور للتنفيذ' : 'صور التنفيذ' }}</h3>
        </template>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm"
          @change="onFilesPicked"
        />
        <p v-if="photoFiles.length" class="mt-2 text-xs text-dimmed">
          {{ photoFiles.length }} صورة هتترفع بعد الحفظ
        </p>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />

      <div class="flex items-center justify-end gap-3">
        <span v-if="progressLabel" class="text-sm text-dimmed">{{ progressLabel }}</span>
        <UButton
          size="lg"
          :label="isEdit ? 'حفظ التعديلات' : 'حفظ التنفيذ'"
          :loading="saving"
          :disabled="!canSubmit"
          @click="onSubmit"
        />
      </div>
    </template>
  </div>
</template>
