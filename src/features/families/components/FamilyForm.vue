<script setup lang="ts">
import {
  emptyMemberForm,
  NEED_STATUS_OPTIONS,
  NEED_STATUS_DEFAULT,
  type FamilyFormState,
} from '@/features/families/composables/useFamilyForm'
import { useNeedTypesCatalog } from '@/features/families/composables/useNeedTypesCatalog'

const form = defineModel<FamilyFormState>({ required: true })

const { needTypes } = useNeedTypesCatalog()

const evaluationOptions = ['مقبولة', 'مرفوضة', 'مؤجلة']

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
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header><h3 class="font-medium">بيانات عامة</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-3">
        <UFormField label="المنطقة">
          <UInput v-model="form.area" class="w-full" />
        </UFormField>
        <UFormField label="العنوان" class="sm:col-span-2">
          <UInput v-model="form.address" class="w-full" />
        </UFormField>
        <UFormField label="تاريخ التسجيل">
          <UInput v-model="form.registration_date" type="date" class="w-full" />
        </UFormField>
        <UFormField label="حالة التقييم">
          <USelectMenu
            v-model="form.evaluation_status"
            :items="evaluationOptions"
            placeholder="اختر الحالة"
            class="w-full"
          />
        </UFormField>
        <!-- <UFormField label="مستوى الثقة">
          <USelectMenu
            v-model="form.confidence"
            :items="confidenceOptions"
            value-key="value"
            label-key="label"
            placeholder="اختر المستوى"
            class="w-full"
          />
        </UFormField> -->
      </div>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">رب الأسرة</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2">
        <UFormField label="الاسم" required>
          <UInput v-model="form.head_name" class="w-full" />
        </UFormField>
        <UFormField label="العمر">
          <UInput v-model="form.head_age" type="number" class="w-full" />
        </UFormField>
        <UFormField label="الهاتف">
          <UInput v-model="form.head_phone" class="w-full" />
        </UFormField>
        <UFormField label="المهنة">
          <UInput v-model="form.head_occupation" class="w-full" />
        </UFormField>
        <UFormField label="التعليم">
          <UInput v-model="form.head_education" class="w-full" />
        </UFormField>
        <UFormField label="الحالة">
          <UInput v-model="form.head_status" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظات" class="sm:col-span-2">
          <UTextarea v-model="form.head_notes" class="w-full" :rows="2" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">الزوج/الزوجة</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2">
        <UFormField label="الاسم">
          <UInput v-model="form.spouse_name" class="w-full" />
        </UFormField>
        <UFormField label="العمر">
          <UInput v-model="form.spouse_age" type="number" class="w-full" />
        </UFormField>
        <UFormField label="الهاتف">
          <UInput v-model="form.spouse_phone" class="w-full" />
        </UFormField>
        <UFormField label="المهنة">
          <UInput v-model="form.spouse_occupation" class="w-full" />
        </UFormField>
        <UFormField label="التعليم">
          <UInput v-model="form.spouse_education" class="w-full" />
        </UFormField>
        <UFormField label="الحالة">
          <UInput v-model="form.spouse_status" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظات" class="sm:col-span-2">
          <UTextarea v-model="form.spouse_notes" class="w-full" :rows="2" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">السكن</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-3">
        <UFormField label="نوع السكن">
          <UInput v-model="form.housing_type" class="w-full" />
        </UFormField>
        <UFormField label="عدد البطاطين">
          <UInput v-model="form.blanket_count" type="number" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظات حالة السكن" class="sm:col-span-3">
          <UTextarea v-model="form.housing_condition_notes" class="w-full" :rows="2" />
        </UFormField>
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

    <UCard>
      <template #header><h3 class="font-medium">الإجماليات المصرح بها</h3></template>
      <div class="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2">
        <UFormField label="الدخل المصرح به">
          <UInput v-model="form.declared_income" type="number" class="w-full" />
        </UFormField>
        <UFormField label="المصروفات المصرح بها">
          <UInput v-model="form.declared_expenses" type="number" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظة العجز">
          <UInput v-model="form.deficit_note" class="w-full" />
        </UFormField>
        <UFormField label="طريقة التعامل مع العجز">
          <UInput v-model="form.deficit_coping" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">ملاحظات عامة</h3></template>
      <div class="p-2">
        <UTextarea v-model="form.general_notes" class="w-full" :rows="3" />
      </div>
    </UCard>
  </div>
</template>
