<route lang="yaml">
meta:
  requiresPerm: users.view
</route>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/lib/supabase'
import { useStore } from '@/store'
import { useVolunteerDetail } from '@/features/volunteers/composables/useVolunteerDetail'
import {
  useVolunteerAssessments,
  type NewAssessmentPayload,
} from '@/features/volunteers/composables/useVolunteerAssessments'
import { useVolunteerNotes } from '@/features/volunteers/composables/useVolunteerNotes'
import PermissionsEditor from '@/features/permissions/components/PermissionsEditor.vue'
import ReviewActions from '@/features/permissions/components/ReviewActions.vue'
import RatingInput from '@/features/volunteers/components/RatingInput.vue'
import ActivityGrid from '@/features/timesheet/components/ActivityGrid.vue'
import { normalizeEgyptPhone, formatDateDMY, formatBool } from '@/utils/format'

const route = useRoute()
const store = useStore()
const userId = computed(() => (route.params as Record<string, string>).id!)

const { volunteer, extra, avatarUrl, notFound, loading, error, reload } = useVolunteerDetail(userId)
const {
  rows: assessments,
  loading: assessmentsLoading,
  submit: submitAssessment,
} = useVolunteerAssessments(userId)
const { rows: notes, loading: notesLoading, submit: submitNote } = useVolunteerNotes(userId)

const statusLabel = (status: string) =>
  ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' })[status] ?? status
const statusColor = (status: string) =>
  status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'
const stateLabel = (state: string | null) =>
  ({ new: 'جديد', active: 'نشط', core: 'أساسي', leader: 'قائد', inactive: 'غير نشط' })[
    state ?? ''
  ] ??
  (state || '—')

const stateOptions = [
  { label: 'جديد', value: 'new' },
  { label: 'نشط', value: 'active' },
  { label: 'أساسي', value: 'core' },
  { label: 'قائد', value: 'leader' },
  { label: 'غير نشط', value: 'inactive' },
]

const editState = ref<string | null>(null)
const editTeam = ref('')
watch(
  volunteer,
  (v) => {
    editState.value = v?.volunteer_state ?? null
    editTeam.value = v?.team ?? ''
  },
  { immediate: true },
)

const savingAdminFields = ref(false)
const adminFieldsError = ref('')

async function onSaveAdminFields() {
  savingAdminFields.value = true
  adminFieldsError.value = ''
  try {
    const { error: err } = (await db.rpc('set_volunteer_admin_fields', {
      target_user: userId.value,
      new_state: editState.value,
      new_team: editTeam.value.trim() || null,
    })) as { error: { message: string } | null }
    if (err) throw err
    await reload()
  } catch {
    adminFieldsError.value = 'حصلت مشكلة. حاول تاني.'
  } finally {
    savingAdminFields.value = false
  }
}

const tabItems = computed(() => {
  const items = [{ label: 'البيانات', value: 'data', slot: 'data' }]
  if (store.hasPerm('users.permissions'))
    items.push({ label: 'الصلاحيات', value: 'perms', slot: 'perms' })
  if (store.hasPerm('users.manage')) {
    items.push({ label: 'التقييمات', value: 'assessments', slot: 'assessments' })
    items.push({ label: 'ملاحظات', value: 'notes', slot: 'notes' })
  }
  items.push({ label: 'النشاط', value: 'activity', slot: 'activity' })
  return items
})

const canManage = computed(() => store.hasPerm('users.manage'))

function blankAssessmentForm(): NewAssessmentPayload {
  return {
    commitment: 3,
    attendance: 3,
    quality: 3,
    communication: 3,
    teamwork: 3,
    initiative: 3,
    strengths: '',
    development: '',
    ready_for_more: false,
    next_step: '',
  }
}

const assessmentForm = ref<NewAssessmentPayload>(blankAssessmentForm())
const savingAssessment = ref(false)
const assessmentError = ref('')

async function onSubmitAssessment() {
  savingAssessment.value = true
  assessmentError.value = ''
  try {
    await submitAssessment({
      ...assessmentForm.value,
      strengths: assessmentForm.value.strengths?.trim() || null,
      development: assessmentForm.value.development?.trim() || null,
      next_step: assessmentForm.value.next_step?.trim() || null,
    })
    assessmentForm.value = blankAssessmentForm()
  } catch (e) {
    assessmentError.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني.'
  } finally {
    savingAssessment.value = false
  }
}

const noteBody = ref('')
const savingNote = ref(false)
const noteError = ref('')

async function onSubmitNote() {
  if (!noteBody.value.trim()) return
  savingNote.value = true
  noteError.value = ''
  try {
    await submitNote(noteBody.value.trim())
    noteBody.value = ''
  } catch (e) {
    noteError.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني.'
  } finally {
    savingNote.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <UButton
      to="/volunteers"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع لقائمة المتطوعين"
    />

    <template v-if="loading">
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-64 w-full" />
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">الصفحة غير موجودة</p>
    </div>

    <template v-else-if="volunteer">
      <UCard>
        <div class="flex items-center gap-4">
          <UAvatar
            :src="avatarUrl ?? undefined"
            :alt="volunteer.full_name ?? volunteer.username"
            size="xl"
          />
          <div class="min-w-0 flex-1">
            <h1 class="text-lg font-bold">{{ volunteer.full_name || volunteer.username }}</h1>
            <!-- Each segment is its own flex item + <bdi> so the LTR username/phone
                 don't get reordered into the RTL run around them. -->
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-dimmed">
              <bdi dir="ltr" class="truncate">@{{ volunteer.username }}</bdi>
              <span aria-hidden="true">·</span>
              <bdi dir="ltr">{{ normalizeEgyptPhone(volunteer.phone) }}</bdi>
              <span aria-hidden="true">·</span>
              <span class="truncate">{{ volunteer.area || '—' }}</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <UBadge :color="statusColor(volunteer.status)" variant="subtle">{{
                statusLabel(volunteer.status)
              }}</UBadge>
              <UBadge color="neutral" variant="subtle">{{
                stateLabel(volunteer.volunteer_state)
              }}</UBadge>
              <UBadge v-if="volunteer.team" color="neutral" variant="outline">{{
                volunteer.team
              }}</UBadge>
            </div>
          </div>
        </div>

        <template v-if="canManage">
          <USeparator class="my-4" />
          <div class="flex flex-wrap items-end gap-3">
            <UFormField label="حالة التطوع">
              <USelectMenu
                v-model="editState"
                :items="stateOptions"
                value-key="value"
                label-key="label"
                class="w-40"
              />
            </UFormField>
            <UFormField label="الفريق">
              <UInput v-model="editTeam" class="w-40" />
            </UFormField>
            <UButton label="حفظ" :loading="savingAdminFields" @click="onSaveAdminFields" />
          </div>
          <UAlert
            v-if="adminFieldsError"
            color="error"
            variant="subtle"
            :title="adminFieldsError"
            icon="i-lucide-alert-circle"
            class="mt-3"
          />
        </template>
      </UCard>

      <ReviewActions
        v-if="store.hasPerm('users.review')"
        :user-id="volunteer.user_id"
        :status="volunteer.status"
        @reviewed="reload"
      />

      <UTabs :items="tabItems" default-value="data" class="w-full">
        <template #data>
          <UCard>
            <div class="grid sm:grid-cols-2 gap-4 p-2">
              <div>
                <p class="text-xs text-dimmed">المنطقة</p>
                <p>{{ volunteer.area || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-dimmed">العمر</p>
                <p>{{ volunteer.age ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-dimmed">المؤهل الدراسي</p>
                <p>{{ extra?.education || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-dimmed">الوظيفة</p>
                <p>{{ extra?.job || '—' }}</p>
              </div>
              <!-- availability: no column yet — add here once it exists -->
            </div>
          </UCard>
        </template>

        <template #perms>
          <PermissionsEditor :user-id="volunteer.user_id" />
        </template>

        <template #assessments>
          <div class="space-y-4">
            <template v-if="assessmentsLoading">
              <USkeleton class="h-24 w-full" />
            </template>
            <template v-else>
              <p v-if="assessments.length === 0" class="text-dimmed text-sm">لا يوجد تقييمات بعد</p>
              <UCard v-for="a in assessments" :key="a.assessment_id">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium">{{ a.author_name || 'غير معروف' }}</p>
                  <p class="text-xs text-dimmed">{{ formatDateDMY(a.created_at) }}</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <p>الالتزام: {{ a.commitment ?? '—' }}</p>
                  <p>الحضور: {{ a.attendance ?? '—' }}</p>
                  <p>الجودة: {{ a.quality ?? '—' }}</p>
                  <p>التواصل: {{ a.communication ?? '—' }}</p>
                  <p>العمل الجماعي: {{ a.teamwork ?? '—' }}</p>
                  <p>روح المبادرة: {{ a.initiative ?? '—' }}</p>
                </div>
                <p v-if="a.strengths" class="text-sm mt-2">
                  <span class="text-dimmed">نقاط القوة:</span> {{ a.strengths }}
                </p>
                <p v-if="a.development" class="text-sm mt-1">
                  <span class="text-dimmed">مجالات التطوير:</span> {{ a.development }}
                </p>
                <p class="text-sm mt-1">
                  <span class="text-dimmed">جاهز لدور أكبر:</span>
                  {{ formatBool(a.ready_for_more) }}
                </p>
                <p v-if="a.next_step" class="text-sm mt-1">
                  <span class="text-dimmed">الخطوة القادمة:</span> {{ a.next_step }}
                </p>
              </UCard>
            </template>

            <UCard>
              <template #header>
                <h3 class="font-semibold">تقييم جديد</h3>
              </template>
              <div class="space-y-3">
                <RatingInput v-model="assessmentForm.commitment" label="الالتزام" />
                <RatingInput v-model="assessmentForm.attendance" label="الحضور" />
                <RatingInput v-model="assessmentForm.quality" label="الجودة" />
                <RatingInput v-model="assessmentForm.communication" label="التواصل" />
                <RatingInput v-model="assessmentForm.teamwork" label="العمل الجماعي" />
                <RatingInput v-model="assessmentForm.initiative" label="روح المبادرة" />
              </div>
              <UFormField label="نقاط القوة" class="mt-3">
                <UTextarea v-model="assessmentForm.strengths" class="w-full" :rows="2" />
              </UFormField>
              <UFormField label="مجالات التطوير" class="mt-3">
                <UTextarea v-model="assessmentForm.development" class="w-full" :rows="2" />
              </UFormField>
              <UFormField label="جاهز لدور أكبر؟" class="mt-3">
                <USwitch v-model="assessmentForm.ready_for_more" />
              </UFormField>
              <UFormField label="الخطوة القادمة" class="mt-3">
                <UInput v-model="assessmentForm.next_step" class="w-full" />
              </UFormField>
              <UAlert
                v-if="assessmentError"
                color="error"
                variant="subtle"
                :title="assessmentError"
                icon="i-lucide-alert-circle"
                class="mt-3"
              />
              <UButton
                label="حفظ التقييم"
                :loading="savingAssessment"
                class="mt-4"
                @click="onSubmitAssessment"
              />
            </UCard>
          </div>
        </template>

        <template #notes>
          <div class="space-y-4">
            <template v-if="notesLoading">
              <USkeleton class="h-16 w-full" />
            </template>
            <template v-else>
              <p v-if="notes.length === 0" class="text-dimmed text-sm">لا يوجد ملاحظات بعد</p>
              <UCard v-for="n in notes" :key="n.note_id">
                <p class="text-sm">{{ n.body }}</p>
                <p class="text-xs text-dimmed mt-2">
                  {{ n.author_name || 'غير معروف' }} · {{ formatDateDMY(n.created_at) }}
                </p>
              </UCard>
            </template>

            <UCard>
              <UTextarea
                v-model="noteBody"
                class="w-full"
                :rows="3"
                placeholder="ملاحظة جديدة..."
              />
              <UAlert
                v-if="noteError"
                color="error"
                variant="subtle"
                :title="noteError"
                icon="i-lucide-alert-circle"
                class="mt-3"
              />
              <UButton
                label="إضافة ملاحظة"
                :loading="savingNote"
                class="mt-3"
                @click="onSubmitNote"
              />
            </UCard>
          </div>
        </template>

        <template #activity>
          <UCard>
            <ActivityGrid :user-id="userId" />
          </UCard>
        </template>
      </UTabs>
    </template>
  </div>
</template>
