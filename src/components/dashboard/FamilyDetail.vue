<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Database } from '@/types/db'
import type { FamilyNeed } from '@/composables/useFamilyDetail'
import { formatValue, formatExpenseCategory } from '@/utils/format'

type Family = Database['public']['Tables']['families']['Row']
type Member = Database['public']['Tables']['members']['Row']
type IncomeSource = Database['public']['Tables']['income_sources']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

const props = defineProps<{
  family: Family
  members: Member[]
  income: IncomeSource[]
  expenses: Expense[]
  needs: FamilyNeed[]
}>()

function anyDefined(...values: unknown[]): boolean {
  return values.some((v) => v !== null && v !== undefined && v !== '')
}

function copyRowId() {
  if (props.family.row_id == null) return
  navigator.clipboard.writeText(String(props.family.row_id))
}

const hasSpouseData = computed(() =>
  anyDefined(
    props.family.spouse_name,
    props.family.spouse_age,
    props.family.spouse_phone,
    props.family.spouse_occupation,
    props.family.spouse_education,
    props.family.spouse_status,
    props.family.spouse_notes,
  ),
)

const hasHousingData = computed(() =>
  anyDefined(props.family.housing_type, props.family.housing_condition_notes, props.family.blanket_count),
)

const hasTotalsData = computed(() =>
  anyDefined(
    props.family.declared_income,
    props.family.declared_expenses,
    props.family.deficit_note,
    props.family.deficit_coping,
  ),
)

const hasNotesData = computed(() =>
  anyDefined(props.family.general_notes, props.family.head_notes, props.family.spouse_notes),
)

function needStatusColor(value: string | null): 'success' | 'error' | 'warning' {
  const v = (value ?? '').trim()
  if (v.includes('مقبول')) return 'success'
  if (v.includes('مرفوض')) return 'error'
  return 'warning'
}

function needStatusIcon(value: string | null): string {
  const v = (value ?? '').trim()
  if (v.includes('مقبول')) return 'i-lucide-check-circle'
  if (v.includes('مرفوض')) return 'i-lucide-x-circle'
  return 'i-lucide-clock'
}

const confidenceInfo = computed(() => {
  const v = String(props.family.confidence ?? '').toLowerCase()
  if (v === 'low') return { label: 'ثقة منخفضة', color: 'error' as const, icon: 'i-lucide-alert-triangle' }
  if (v === 'medium') return { label: 'ثقة متوسطة', color: 'warning' as const, icon: 'i-lucide-info' }
  if (v === 'high') return { label: 'ثقة عالية', color: 'success' as const, icon: 'i-lucide-check-circle' }
  return null
})

const memberColumns: TableColumn<Member>[] = [
  { accessorKey: 'name', header: 'الاسم' },
  { accessorKey: 'age', header: 'العمر' },
  { accessorKey: 'relation', header: 'صلة القرابة' },
  { accessorKey: 'is_working', header: 'يعمل' },
  { accessorKey: 'education_level', header: 'المستوى التعليمي' },
  { accessorKey: 'education_monthly_cost', header: 'تكلفة التعليم الشهرية' },
  { accessorKey: 'notes', header: 'ملاحظات' },
]

const incomeColumns: TableColumn<IncomeSource>[] = [
  { accessorKey: 'source_type', header: 'نوع المصدر' },
  { accessorKey: 'source_detail', header: 'التفاصيل' },
  { accessorKey: 'amount', header: 'المبلغ' },
]

const expenseColumns: TableColumn<Expense>[] = [
  { accessorKey: 'category', header: 'البند' },
  { accessorKey: 'amount', header: 'المبلغ' },
  { accessorKey: 'notes', header: 'ملاحظات' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-xl font-semibold">{{ family.head_name ?? '—' }}</h2>
        <UBadge v-if="family.evaluation_status" variant="subtle" color="neutral">
          {{ family.evaluation_status }}
        </UBadge>
        <!-- <UTooltip v-if="confidenceInfo" :text="`مستوى الثقة في تصنيف احتياجات هذه الأسرة: ${confidenceInfo.label}`">
          <UBadge :color="confidenceInfo.color" variant="subtle" :icon="confidenceInfo.icon">
            {{ confidenceInfo.label }}
          </UBadge>
        </UTooltip> -->
      </div>
      <p class="text-dimmed text-sm">
        {{ family.area ?? '—' }} · {{ formatValue(family.member_count, 'number') }} أفراد ·
        {{ formatValue(family.registration_date, 'date') }}
      </p>
      <p v-if="family.source_sheet || family.row_id" class="text-dimmed mt-1 text-xs" title="البيانات فى الشيت">
        المصدر: {{ family.source_sheet ?? '—' }} ·
        <span
          v-if="family.row_id"
          class="cursor-pointer hover:underline"
          title="نسخ رقم الصف"
          @click="copyRowId"
        >صف {{ family.row_id }}</span>
        <span v-else>صف —</span>
      </p>
    </div>

    <UCard>
      <template #header><h3 class="font-medium">الأسرة</h3></template>
      <div class="grid grid-cols-1 gap-6" :class="hasSpouseData ? 'sm:grid-cols-2' : ''">
        <dl class="grid grid-cols-2 gap-3 text-sm py-2 px-4">
          <p class="col-span-2 text-dimmed font-medium">رب الأسرة</p>
          <div>
            <dt class="text-dimmed">العمر</dt>
            <dd>{{ formatValue(family.head_age, 'number') }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">الهاتف</dt>
            <dd>{{ family.head_phone ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">المهنة</dt>
            <dd>{{ family.head_occupation ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">التعليم</dt>
            <dd>{{ family.head_education ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">الحالة</dt>
            <dd>{{ family.head_status ?? '—' }}</dd>
          </div>
        </dl>

        <dl v-if="hasSpouseData" class="grid grid-cols-2 gap-3 text-sm py-2 px-4">
          <p class="col-span-2 text-dimmed font-medium">الزوج/الزوجة</p>
          <div>
            <dt class="text-dimmed">الاسم</dt>
            <dd>{{ family.spouse_name ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">العمر</dt>
            <dd>{{ formatValue(family.spouse_age, 'number') }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">الهاتف</dt>
            <dd>{{ family.spouse_phone ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">المهنة</dt>
            <dd>{{ family.spouse_occupation ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">التعليم</dt>
            <dd>{{ family.spouse_education ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">الحالة</dt>
            <dd>{{ family.spouse_status ?? '—' }}</dd>
          </div>
        </dl>
      </div>
    </UCard>

    <UCard v-if="hasHousingData">
      <template #header><h3 class="font-medium">السكن</h3></template>
      <dl class="grid grid-cols-2 gap-3 text-sm py-2 px-4 sm:grid-cols-3">
        <div>
          <dt class="text-dimmed">نوع السكن</dt>
          <dd>{{ family.housing_type ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-dimmed">عدد البطاطين</dt>
          <dd>{{ formatValue(family.blanket_count, 'number') }}</dd>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <dt class="text-dimmed">ملاحظات حالة السكن</dt>
          <dd>{{ family.housing_condition_notes ?? '—' }}</dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">أفراد الأسرة</h3></template>
      <p v-if="members.length === 0" class="text-dimmed py-4 text-center text-sm">لا يوجد أفراد مسجلون</p>
      <UTable v-else :data="members" :columns="memberColumns">
        <template #is_working-cell="{ row }">{{ formatValue(row.getValue('is_working'), 'bool') }}</template>
        <template #age-cell="{ row }">{{ formatValue(row.getValue('age'), 'number') }}</template>
        <template #education_monthly_cost-cell="{ row }">
          {{ formatValue(row.getValue('education_monthly_cost'), 'money') }}
        </template>
      </UTable>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">مصادر الدخل</h3></template>
      <p v-if="income.length === 0" class="text-dimmed py-4 text-center text-sm">لا توجد مصادر دخل مسجلة</p>
      <UTable v-else :data="income" :columns="incomeColumns">
        <template #amount-cell="{ row }">{{ formatValue(row.getValue('amount'), 'money') }}</template>
      </UTable>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">المصروفات</h3></template>
      <p v-if="expenses.length === 0" class="text-dimmed py-4 text-center text-sm">لا توجد مصروفات مسجلة</p>
      <UTable v-else :data="expenses.filter(ex => ex.amount > 0)" :columns="expenseColumns">
        <template #category-cell="{ row }">{{ formatExpenseCategory(row.getValue('category')) }}</template>
        <template #amount-cell="{ row }">{{ formatValue(row.getValue('amount'), 'money') }}</template>
      </UTable>
    </UCard>

    <UCard v-if="hasTotalsData">
      <template #header><h3 class="font-medium">الإجماليات المصرح بها</h3></template>
      <dl class="grid grid-cols-2 gap-3 text-sm py-2 px-4 sm:grid-cols-4">
        <div>
          <dt class="text-dimmed">الدخل المصرح به</dt>
          <dd>{{ formatValue(family.declared_income, 'money') }}</dd>
        </div>
        <div>
          <dt class="text-dimmed">المصروفات المصرح بها</dt>
          <dd>{{ formatValue(family.declared_expenses, 'money') }}</dd>
        </div>
        <div>
          <dt class="text-dimmed">ملاحظة العجز</dt>
          <dd>{{ family.deficit_note ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-dimmed">طريقة التعامل مع العجز</dt>
          <dd>{{ family.deficit_coping ?? '—' }}</dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header><h3 class="font-medium">الاحتياجات</h3></template>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 py-2 px-4">
        <div>
          <p class="text-dimmed mb-2 text-sm font-medium">الاحتياجات المصنفة</p>
          <p v-if="needs.length === 0" class="text-dimmed py-4 text-center text-sm">لا توجد احتياجات مسجلة</p>
          <ul v-else class="space-y-2">
            <li v-for="need in needs" :key="need.need_id" class="flex flex-wrap items-center gap-2">
              <UTooltip :text="need.source === 'inferred' ? 'احتياج مستنتج بواسطة النموذج، يحتاج مراجعة' : 'احتياج مصرح به من الشيت'">
                <UIcon
                  :name="need.source === 'inferred' ? 'i-lucide-sparkles' : 'i-lucide-file-check'"
                  :class="need.source === 'inferred' ? 'text-warning' : 'text-dimmed'"
                  class="size-4 shrink-0"
                />
              </UTooltip>
              <span>{{ need.label }}</span>
              <UBadge
                v-if="need.status"
                :color="needStatusColor(need.status)"
                variant="solid"
                :icon="needStatusIcon(need.status)"
                class="font-semibold"
              >
                {{ need.status }}
              </UBadge>
              <span v-if="need.note" class="text-dimmed text-sm">— {{ need.note }}</span>
            </li>
          </ul>
        </div>
        <div>
          <p class="text-dimmed mb-2 text-sm font-medium">النص الأصلي من الشيت</p>
          <p v-if="family.needs_raw" class="bg-elevated rounded-md p-3 text-sm whitespace-pre-wrap">
            {{ family.needs_raw }}
          </p>
          <p v-else class="text-dimmed py-4 text-center text-sm">لا يوجد نص أصلي</p>
        </div>
      </div>
    </UCard>

    <UCard v-if="hasNotesData">
      <template #header><h3 class="font-medium">ملاحظات</h3></template>
      <dl class="space-y-3 text-sm py-2 px-4">
        <div v-if="family.general_notes">
          <dt class="text-dimmed">ملاحظات عامة</dt>
          <dd>{{ family.general_notes }}</dd>
        </div>
        <div v-if="family.head_notes">
          <dt class="text-dimmed">ملاحظات عن رب الأسرة</dt>
          <dd>{{ family.head_notes }}</dd>
        </div>
        <div v-if="family.spouse_notes">
          <dt class="text-dimmed">ملاحظات عن الزوج/الزوجة</dt>
          <dd>{{ family.spouse_notes }}</dd>
        </div>
      </dl>
    </UCard>
  </div>
</template>
