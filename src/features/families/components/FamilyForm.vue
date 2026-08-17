<script setup lang="ts">
import {
  emptyMemberForm,
  NEED_STATUS_OPTIONS,
  NEED_STATUS_DEFAULT,
  type FamilyFormState,
} from '@/features/families/composables/useFamilyForm'
import { useNeedTypesCatalog } from '@/features/families/composables/useNeedTypesCatalog'
import { familyFormSections } from '@/features/families/config/form'
import FormSection from '@/features/families/components/FormSection.vue'

const form = defineModel<FamilyFormState>({ required: true })

const { needTypes } = useNeedTypesCatalog()

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
    <UCard v-for="section in familyFormSections" :key="section.title">
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
  </div>
</template>
