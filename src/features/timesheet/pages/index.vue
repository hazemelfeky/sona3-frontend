<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, computed } from 'vue'
import { useStore } from '@/store'
import ActivityGrid from '@/features/timesheet/components/ActivityGrid.vue'
import {
  useTimesheetEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  type TimesheetEntry,
} from '@/features/timesheet/composables/useTimesheet'
import { splitDuration, formatDuration } from '@/features/timesheet/utils/duration'
import { toDateKey } from '@/features/timesheet/composables/useDailyActivity'
import { formatDateDMY } from '@/utils/format'

const store = useStore()
const myId = computed(() => store.userId)

const { rows, loading, error, refresh } = useTimesheetEntries(myId)

// ActivityGrid loads on mount and on userId change; bumping this key is how
// a fresh insert/edit/delete gets reflected without threading a refresh
// handle through the component.
const gridKey = ref(0)

const today = toDateKey(new Date())

function blankForm() {
  return { description: '', hours: 0, minutes: 0, task_date: today }
}

const form = ref(blankForm())
const saving = ref(false)
const formError = ref('')

const formMinutes = computed(
  () => Number(form.value.hours || 0) * 60 + Number(form.value.minutes || 0),
)
const canSubmit = computed(() => form.value.description.trim().length > 0 && formMinutes.value > 0)

async function onSubmit() {
  if (!canSubmit.value || !myId.value) return
  saving.value = true
  formError.value = ''
  try {
    await createEntry(myId.value, {
      description: form.value.description.trim(),
      duration_minutes: formMinutes.value,
      task_date: form.value.task_date,
    })
    form.value = blankForm()
    await refresh()
    gridKey.value++
  } catch (e) {
    formError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني.')
  } finally {
    saving.value = false
  }
}

/* ---- edit ---- */

const editOpen = ref(false)
const editTarget = ref<TimesheetEntry | null>(null)
const editForm = ref(blankForm())
const editSaving = ref(false)
const editError = ref('')

const editMinutes = computed(
  () => Number(editForm.value.hours || 0) * 60 + Number(editForm.value.minutes || 0),
)
const canSaveEdit = computed(
  () => editForm.value.description.trim().length > 0 && editMinutes.value > 0,
)

function openEdit(entry: TimesheetEntry) {
  const { hours, minutes } = splitDuration(entry.duration_minutes)
  editTarget.value = entry
  editForm.value = { description: entry.description, hours, minutes, task_date: entry.task_date }
  editError.value = ''
  editOpen.value = true
}

async function onSaveEdit() {
  if (!editTarget.value || !canSaveEdit.value) return
  editSaving.value = true
  editError.value = ''
  try {
    await updateEntry(editTarget.value.id, {
      description: editForm.value.description.trim(),
      duration_minutes: editMinutes.value,
      task_date: editForm.value.task_date,
    })
    editOpen.value = false
    await refresh()
    gridKey.value++
  } catch (e) {
    editError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني.')
  } finally {
    editSaving.value = false
  }
}

/* ---- delete ---- */

const deleteOpen = ref(false)
const deleteTarget = ref<TimesheetEntry | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function openDelete(entry: TimesheetEntry) {
  deleteTarget.value = entry
  deleteError.value = ''
  deleteOpen.value = true
}

async function onConfirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteEntry(deleteTarget.value.id)
    deleteOpen.value = false
    await refresh()
    gridKey.value++
  } catch (e) {
    deleteError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <h1 class="text-2xl font-semibold">تايم شيتي</h1>

    <UCard>
      <template #header>
        <h2 class="font-semibold">تسجيل مهمة</h2>
      </template>

      <form class="space-y-4 p-2" @submit.prevent="onSubmit">
        <UFormField label="الوصف" required>
          <UInput
            v-model="form.description"
            icon="i-lucide-clipboard-list"
            placeholder="إيه اللي عملته؟"
            class="w-full"
          />
        </UFormField>

        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="المدة" required>
            <div class="flex items-center gap-2">
              <UInput v-model.number="form.hours" type="number" min="0" class="w-24" />
              <span class="text-dimmed text-sm">س</span>
              <UInput v-model.number="form.minutes" type="number" min="0" max="59" class="w-24" />
              <span class="text-dimmed text-sm">د</span>
            </div>
          </UFormField>

          <UFormField label="التاريخ" required>
            <UInput
              v-model="form.task_date"
              type="date"
              :max="today"
              icon="i-lucide-calendar"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          :title="formError"
          icon="i-lucide-alert-circle"
        />

        <div class="flex justify-end">
          <UButton type="submit" :loading="saving" :disabled="!canSubmit">تسجيل</UButton>
        </div>
      </form>
    </UCard>

    <UCard>
      <ActivityGrid v-if="myId" :key="gridKey" :user-id="myId" />
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">مهامي</h2>
      </template>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
        icon="i-lucide-alert-circle"
              :actions="[{ label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: refresh }]"
      />

      <template v-else-if="loading">
        <USkeleton v-for="i in 3" :key="i" class="h-14 w-full mb-2" />
      </template>

      <p v-else-if="!rows.length" class="text-dimmed text-sm text-center py-8">
        لسه مسجلتش أي مهمة.
      </p>

      <ul v-else class="divide-y divide-default">
        <li v-for="entry in rows" :key="String(entry.id)" class="flex items-center gap-3 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate">{{ entry.description }}</p>
            <p class="text-xs text-dimmed">
              {{ formatDateDMY(entry.task_date) }} · {{ formatDuration(entry.duration_minutes) }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              aria-label="تعديل"
              @click="openEdit(entry)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="sm"
              color="error"
              variant="ghost"
              aria-label="مسح"
              @click="openDelete(entry)"
            />
          </div>
        </li>
      </ul>
    </UCard>

    <UModal v-model:open="editOpen" title="تعديل المهمة">
      <template #body>
        <div class="space-y-4">
          <UFormField label="الوصف" required>
            <UInput v-model="editForm.description" class="w-full" />
          </UFormField>

          <UFormField label="المدة" required>
            <div class="flex items-center gap-2">
              <UInput v-model.number="editForm.hours" type="number" min="0" class="w-24" />
              <span class="text-dimmed text-sm">س</span>
              <UInput
                v-model.number="editForm.minutes"
                type="number"
                min="0"
                max="59"
                class="w-24"
              />
              <span class="text-dimmed text-sm">د</span>
            </div>
          </UFormField>

          <UFormField label="التاريخ" required>
            <UInput v-model="editForm.task_date" type="date" :max="today" class="w-full" />
          </UFormField>

          <UAlert
            v-if="editError"
            color="error"
            variant="subtle"
            :title="editError"
            icon="i-lucide-alert-circle"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="إلغاء"
            variant="ghost"
            color="neutral"
            :disabled="editSaving"
            @click="editOpen = false"
          />
          <UButton label="حفظ" :loading="editSaving" :disabled="!canSaveEdit" @click="onSaveEdit" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="مسح المهمة">
      <template #body>
        <p class="text-sm">
          هتمسح
          <span class="font-semibold">{{ deleteTarget?.description }}</span>
          نهائيًا، وده إجراء لا رجعة فيه.
        </p>

        <UAlert
          v-if="deleteError"
          color="error"
          variant="subtle"
          :title="deleteError"
          icon="i-lucide-alert-circle"
          class="mt-4"
        />
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="إلغاء"
            variant="ghost"
            color="neutral"
            :disabled="deleting"
            @click="deleteOpen = false"
          />
          <UButton label="مسح نهائيًا" color="error" :loading="deleting" @click="onConfirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
