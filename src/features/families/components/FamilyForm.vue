<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  emptyMemberForm,
  NEED_STATUS_OPTIONS,
  NEED_STATUS_DEFAULT,
  SPOUSE_FORM_KEYS,
  type FamilyFormState,
} from '@/features/families/composables/useFamilyForm'
import { useNeedTypesCatalog } from '@/features/families/composables/useNeedTypesCatalog'
import { familyFormSections } from '@/features/families/config/form'
import FormSection from '@/features/families/components/FormSection.vue'

const form = defineModel<FamilyFormState>({ required: true })

const { needTypes } = useNeedTypesCatalog()

// Sections are matched by prefix, not by their Arabic title — the title is
// display copy and shouldn't be load-bearing.
const HEAD_PREFIX = 'head_'
const SPOUSE_PREFIX = 'spouse_'

// A widow has no spouse to record, so that section disappears entirely.
const visibleSections = computed(() =>
  familyFormSections.filter((section) => !(form.value.is_widow && section.prefix === SPOUSE_PREFIX)),
)

const hasSpouseData = computed(() =>
  SPOUSE_FORM_KEYS.some((key) => String(form.value[key] ?? '').trim() !== ''),
)

function clearSpouseFields() {
  for (const key of SPOUSE_FORM_KEYS) form.value[key] = ''
}

// Ticking the box throws away whatever is in the spouse section, so it asks
// first whenever there's actually something to lose. The box only flips
// after the answer — cancelling leaves both the tick and the data alone.
const confirmClearOpen = ref(false)

function onWidowChange(checked: boolean) {
  if (!checked) {
    form.value.is_widow = false
    return
  }
  if (hasSpouseData.value) {
    confirmClearOpen.value = true
    return
  }
  form.value.is_widow = true
}

function confirmWidow() {
  clearSpouseFields()
  form.value.is_widow = true
  confirmClearOpen.value = false
}

function addMember() {
  form.value.members.push(emptyMemberForm())
}

function removeMember(index: number) {
  form.value.members.splice(index, 1)
}

function needStatusFor(code: string) {
  return form.value.needStatus[code] ?? NEED_STATUS_DEFAULT
}

function setNeedStatus(code: string, status: string) {
  form.value.needStatus[code] = status as (typeof NEED_STATUS_OPTIONS)[number]
}

function setField(fullKey: string, value: string) {
  ;(form.value as unknown as Record<string, string>)[fullKey] = value
}

// Only the general/housing sections need 3 columns — the rest read better
// at 2. Column count is layout, so it lives here in the renderer rather
// than in familyFormSections (which describes fields only).
const sectionGridClass: Record<string, string> = {
  'بيانات عامة': 'sm:grid-cols-3',
  'رب الأسرة': 'sm:grid-cols-2',
  'الزوج/الزوجة': 'sm:grid-cols-2',
  'السكن': 'sm:grid-cols-3',
  'الإجماليات المصرح بها': 'sm:grid-cols-2',
}
</script>

<template>
  <div class="space-y-6">
    <UCard v-for="section in visibleSections" :key="section.title">
      <template #header><h3 class="font-medium">{{ section.title }}</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2" :class="sectionGridClass[section.title]">
        <FormSection
          :fields="section.fields"
          :prefix="section.prefix"
          :form="form"
          @change="setField"
        >
          <template #head_name="{ field }">
            <UFormField :label="field.label" required>
              <UInput v-model="form.head_name" class="w-full" />
            </UFormField>
          </template>
          <template #address="{ field }">
            <UFormField :label="field.label" class="sm:col-span-2">
              <UInput v-model="form.address" class="w-full" />
            </UFormField>
          </template>
        </FormSection>
      </div>

      <!-- Sits at the end of the head-of-family card, immediately before the
           spouse section it controls. -->
      <div v-if="section.prefix === HEAD_PREFIX" class="px-2 pb-2">
        <UCheckbox
          :model-value="form.is_widow"
          label="أرملة"
          description="رب الأسرة أرملة — مش هيتسجل بيانات زوج."
          @update:model-value="(checked: boolean | 'indeterminate') => onWidowChange(checked === true)"
        />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-medium">أفراد الأسرة</h3>
          <UButton
            label="إضافة فرد"
            icon="i-lucide-plus"
            size="sm"
            variant="soft"
            color="neutral"
            @click="addMember"
          />
        </div>
      </template>

      <p v-if="form.members.length === 0" class="text-dimmed py-4 text-center text-sm">
        لا يوجد أفراد مسجلون
      </p>

      <div v-else class="space-y-4 p-2">
        <div
          v-for="(member, index) in form.members"
          :key="member.member_id ?? `new-${index}`"
          class="border-default rounded-lg border p-3"
        >
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <UFormField label="الاسم">
              <UInput v-model="member.name" class="w-full" />
            </UFormField>
            <UFormField label="العمر">
              <UInput v-model="member.age" type="number" class="w-full" />
            </UFormField>
            <UFormField label="صلة القرابة">
              <UInput v-model="member.relation" class="w-full" />
            </UFormField>
            <UFormField label="المستوى التعليمي">
              <UInput v-model="member.education_level" class="w-full" />
            </UFormField>
            <UFormField label="تكلفة التعليم الشهرية">
              <UInput v-model="member.education_monthly_cost" type="number" class="w-full" />
            </UFormField>
            <UFormField label="يعمل؟">
              <UCheckbox v-model="member.is_working" class="mt-2" />
            </UFormField>
            <UFormField label="ملاحظات" class="sm:col-span-3">
              <UTextarea v-model="member.notes" class="w-full" :rows="2" />
            </UFormField>
          </div>

          <div class="mt-2 flex justify-end">
            <UButton
              label="حذف الفرد"
              icon="i-lucide-trash-2"
              size="sm"
              variant="ghost"
              color="error"
              @click="removeMember(index)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">الاحتياجات</h3></template>
      <div class="p-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="need in needTypes"
          :key="need.code"
          class="flex items-center justify-between gap-3 py-1.5"
        >
          <span class="text-sm">{{ need.label_ar }}</span>
          <USelectMenu
            v-if="need.code != 'other'"
            :model-value="needStatusFor(need.code)"
            :items="NEED_STATUS_OPTIONS"
            class="w-36"
            @update:model-value="(status: string) => setNeedStatus(need.code, status)"
          />
        </div>
      </div>
      <div class="pt-3">
        <div class="mb-1 flex items-center justify-between gap-3">
          <span class="text-sm font-medium">احتياجات أخرى</span>
        </div>
        <UTextarea
          v-model="form.otherNeedNote"
          class="w-full"
          :rows="2"
          placeholder="أي احتياج مش موجود فوق"
        />
      </div>
    </UCard>

    <UModal v-model:open="confirmClearOpen" title="أرملة">
      <template #body>
        <p class="text-sm">هيتم مسح بيانات الزوج. تمام؟</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="إلغاء"
            variant="ghost"
            color="neutral"
            @click="confirmClearOpen = false"
          />
          <UButton label="تمام" color="error" @click="confirmWidow" />
        </div>
      </template>
    </UModal>
  </div>
</template>
