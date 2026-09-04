<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, computed, watch } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { useStore } from '@/store'
import { useFamilyPhotos, type FamilyPhoto } from '@/features/families/composables/useFamilyPhotos'

const props = defineProps<{ familyId: number }>()

const store = useStore()
const toast = useToast()

// The detail page already gates on families.view — this is defence in
// depth, the same way DashboardView re-checks its own config permission.
const canView = computed(() => store.hasPerm('families.view'))
const canManage = computed(() => store.hasPerm('families.create'))

const familyId = computed(() => props.familyId)
const { photos, loading, error, uploadProgress, refresh, upload, remove, saveCaption } =
  useFamilyPhotos(familyId)

/* ---- upload ---- */

const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')

async function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length || !store.userId) return
  uploadError.value = ''
  try {
    await upload(files, store.userId)
    toast.add({ title: 'تم رفع الصور', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err) {
    uploadError.value = toUserMessage(err, 'حصلت مشكلة. حاول تاني.')
  } finally {
    // Always clear, or picking the same file twice in a row fires no change.
    input.value = ''
  }
}

/* ---- lightbox ---- */

const openIndex = ref<number | null>(null)
const current = computed(() =>
  openIndex.value === null ? null : (photos.value[openIndex.value] ?? null),
)

// RTL: the gallery flows right-to-left, so the next photo sits to the LEFT.
// ArrowLeft therefore advances and ArrowRight goes back, matching both the
// on-screen chevrons and how the thumbnails are actually laid out.
const hasPrev = computed(() => openIndex.value !== null && openIndex.value > 0)
const hasNext = computed(
  () => openIndex.value !== null && openIndex.value < photos.value.length - 1,
)

function openAt(index: number) {
  openIndex.value = index
  confirmingDelete.value = false
  editingCaption.value = false
}
function close() {
  openIndex.value = null
  confirmingDelete.value = false
  editingCaption.value = false
}
function prev() {
  if (hasPrev.value) openAt(openIndex.value! - 1)
}
function next() {
  if (hasNext.value) openAt(openIndex.value! + 1)
}

onKeyStroke('Escape', () => {
  if (openIndex.value !== null) close()
})
onKeyStroke('ArrowLeft', (e) => {
  if (openIndex.value === null) return
  e.preventDefault()
  next()
})
onKeyStroke('ArrowRight', (e) => {
  if (openIndex.value === null) return
  e.preventDefault()
  prev()
})

// A delete can shrink the list out from under the open index.
watch(photos, (list) => {
  if (openIndex.value === null) return
  if (!list.length) close()
  else if (openIndex.value > list.length - 1) openIndex.value = list.length - 1
})

/* ---- caption ---- */

const editingCaption = ref(false)
const captionDraft = ref('')
const savingCaption = ref(false)

function startCaption(photo: FamilyPhoto) {
  captionDraft.value = photo.caption ?? ''
  editingCaption.value = true
}

async function onSaveCaption() {
  if (!current.value) return
  savingCaption.value = true
  try {
    await saveCaption(current.value, captionDraft.value)
    editingCaption.value = false
  } catch (err) {
    uploadError.value = toUserMessage(err, 'حصلت مشكلة. حاول تاني.')
  } finally {
    savingCaption.value = false
  }
}

/* ---- delete ---- */

// Confirmed inline rather than in a UModal: a dialog stacked over a
// hand-rolled fullscreen overlay is a z-index fight with nothing to gain.
const confirmingDelete = ref(false)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!current.value) return
  deleting.value = true
  try {
    await remove(current.value)
    confirmingDelete.value = false
    toast.add({ title: 'تم حذف الصورة', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err) {
    uploadError.value = toUserMessage(err, 'حصلت مشكلة. حاول تاني.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UCard v-if="canView">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-medium">صور ومرفقات</h3>

        <template v-if="canManage">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onFilesPicked"
          />
          <UButton
            icon="i-lucide-image-plus"
            label="إضافة صورة"
            size="sm"
            variant="soft"
            color="neutral"
            :loading="Boolean(uploadProgress)"
            @click="fileInput?.click()"
          />
        </template>
      </div>
    </template>

    <p v-if="uploadProgress" class="text-sm text-dimmed mb-3">
      جاري الرفع… {{ uploadProgress.done }} من {{ uploadProgress.total }}
    </p>

    <UAlert
      v-if="uploadError"
      color="error"
      variant="subtle"
      :title="uploadError"
      icon="i-lucide-alert-circle"
      class="mb-3"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
          :actions="[{ label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: refresh }]"
    />

    <div v-else-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <USkeleton v-for="i in 4" :key="i" class="aspect-square w-full rounded-md" />
    </div>

    <p v-else-if="!photos.length" class="text-dimmed text-sm text-center py-8">لا توجد صور بعد</p>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <button
        v-for="(photo, index) in photos"
        :key="photo.attachment_id"
        type="button"
        class="group text-start"
        @click="openAt(index)"
      >
        <img
          :src="photo.url ?? undefined"
          :alt="photo.caption ?? 'صورة الأسرة'"
          loading="lazy"
          class="aspect-square w-full rounded-md object-cover bg-elevated ring-1 ring-default transition group-hover:opacity-90"
        />
        <p v-if="photo.caption" class="mt-1 text-xs text-dimmed truncate">{{ photo.caption }}</p>
      </button>
    </div>
  </UCard>

  <!-- Lightbox. Teleported so the fixed overlay escapes the card's stacking
       context and covers the page whatever it's nested inside. -->
  <Teleport to="body">
    <div
      v-if="current"
      class="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="close"
    >
      <div class="flex items-center justify-between gap-2 text-white/80" @click.stop>
        <span class="text-sm">{{ (openIndex ?? 0) + 1 }} / {{ photos.length }}</span>
        <div class="flex items-center gap-1">
          <UButton
            v-if="canManage && !confirmingDelete"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            aria-label="حذف الصورة"
            @click="confirmingDelete = true"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="إغلاق"
            @click="close"
          />
        </div>
      </div>

      <div class="flex flex-1 items-center justify-center gap-2 min-h-0" @click.self="close">
        <!-- Left edge advances: in RTL the next photo is the one to the left. -->
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="lg"
          :disabled="!hasNext"
          aria-label="التالية"
          @click.stop="next"
        />

        <img
          :src="current.url ?? undefined"
          :alt="current.caption ?? 'صورة الأسرة'"
          class="max-h-full max-w-full object-contain"
          @click.stop
        />

        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="lg"
          :disabled="!hasPrev"
          aria-label="السابقة"
          @click.stop="prev"
        />
      </div>

      <div class="shrink-0 pt-3 text-center" @click.stop>
        <div v-if="confirmingDelete" class="flex items-center justify-center gap-2">
          <span class="text-sm text-white">حذف الصورة؟</span>
          <UButton
            label="تأكيد"
            color="error"
            size="sm"
            :loading="deleting"
            @click="onConfirmDelete"
          />
          <UButton
            label="إلغاء"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="deleting"
            @click="confirmingDelete = false"
          />
        </div>

        <div v-else-if="editingCaption" class="flex items-center justify-center gap-2">
          <UInput v-model="captionDraft" placeholder="وصف الصورة" class="w-64" />
          <UButton label="حفظ" size="sm" :loading="savingCaption" @click="onSaveCaption" />
          <UButton
            label="إلغاء"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="savingCaption"
            @click="editingCaption = false"
          />
        </div>

        <template v-else>
          <p v-if="current.caption" class="text-sm text-white">{{ current.caption }}</p>
          <UButton
            v-if="canManage"
            :label="current.caption ? 'تعديل الوصف' : 'إضافة وصف'"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            class="mt-1"
            @click="startCaption(current)"
          />
        </template>
      </div>
    </div>
  </Teleport>
</template>
