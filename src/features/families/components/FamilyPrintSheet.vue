<script setup lang="ts">
import { computed } from 'vue'
import type { Database } from '@/types/db'
import type { FamilyNeed } from '@/composables/useFamilyDetail'
import { formatValue, formatDateDMY, formatExpenseCategory } from '@/utils/format'

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

const activeNeeds = computed(() => props.needs.filter((n) => !(n.status ?? '').includes('مرفوض')))

const paidExpenses = computed(() => props.expenses.filter((ex) => ex.amount !== null && ex.amount > 0))

const hasSpouseData = computed(() =>
  anyDefined(
    props.family.spouse_name,
    props.family.spouse_age,
    props.family.spouse_phone,
    props.family.spouse_occupation,
    props.family.spouse_education,
    props.family.spouse_status,
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
</script>

<template>
  <div class="print-sheet">
    <header class="print-section print-header">
      <img src="/logo.svg" alt="Sona3" class="print-logo" />
      <h1>بيانات أسرة</h1>
      <div class="print-header-meta">
        <span>{{ props.family.head_name ?? '—' }}</span>
        <span>رقم الأسرة: {{ props.family.family_id }}</span>
        <span>تاريخ الطباعة: {{ formatDateDMY(new Date()) }}</span>
      </div>
    </header>

    <section class="print-section">
      <h2>البيانات الأساسية</h2>
      <dl class="print-fields">
        <div><dt>الاسم</dt><dd>{{ props.family.head_name ?? '—' }}</dd></div>
        <div><dt>المنطقة</dt><dd>{{ props.family.area ?? '—' }}</dd></div>
        <div><dt>العنوان التفصيلي</dt><dd>{{ props.family.address ?? '—' }}</dd></div>
        <div v-if="anyDefined(props.family.member_count)"><dt>عدد الأفراد</dt><dd>{{ formatValue(props.family.member_count, 'number') }}</dd></div>
        <div v-if="props.family.evaluation_status"><dt>حالة التقييم</dt><dd>{{ props.family.evaluation_status }}</dd></div>
        <div v-if="props.family.registration_date"><dt>تاريخ التسجيل</dt><dd>{{ formatValue(props.family.registration_date, 'date') }}</dd></div>
        <div v-if="props.family.source_sheet"><dt>الشيت المصدر</dt><dd>{{ props.family.source_sheet }}</dd></div>
        <div v-if="anyDefined(props.family.row_id)"><dt>رقم الصف</dt><dd>{{ props.family.row_id }}</dd></div>
      </dl>
    </section>

    <section class="print-section">
      <h2>الأسرة</h2>
      <p class="print-subhead">رب الأسرة</p>
      <dl class="print-fields">
        <div v-if="anyDefined(props.family.head_age)"><dt>العمر</dt><dd>{{ formatValue(props.family.head_age, 'number') }}</dd></div>
        <div v-if="props.family.head_phone"><dt>الهاتف</dt><dd>{{ props.family.head_phone }}</dd></div>
        <div v-if="props.family.head_occupation"><dt>المهنة</dt><dd>{{ props.family.head_occupation }}</dd></div>
        <div v-if="props.family.head_education"><dt>التعليم</dt><dd>{{ props.family.head_education }}</dd></div>
        <div v-if="props.family.head_status"><dt>الحالة</dt><dd>{{ props.family.head_status }}</dd></div>
      </dl>

      <template v-if="hasSpouseData">
        <p class="print-subhead">الزوج/الزوجة</p>
        <dl class="print-fields">
          <div v-if="props.family.spouse_name"><dt>الاسم</dt><dd>{{ props.family.spouse_name }}</dd></div>
          <div v-if="anyDefined(props.family.spouse_age)"><dt>العمر</dt><dd>{{ formatValue(props.family.spouse_age, 'number') }}</dd></div>
          <div v-if="props.family.spouse_phone"><dt>الهاتف</dt><dd>{{ props.family.spouse_phone }}</dd></div>
          <div v-if="props.family.spouse_occupation"><dt>المهنة</dt><dd>{{ props.family.spouse_occupation }}</dd></div>
          <div v-if="props.family.spouse_education"><dt>التعليم</dt><dd>{{ props.family.spouse_education }}</dd></div>
          <div v-if="props.family.spouse_status"><dt>الحالة</dt><dd>{{ props.family.spouse_status }}</dd></div>
        </dl>
      </template>
    </section>

    <section v-if="hasHousingData" class="print-section">
      <h2>السكن</h2>
      <dl class="print-fields">
        <div v-if="props.family.housing_type"><dt>نوع السكن</dt><dd>{{ props.family.housing_type }}</dd></div>
        <div v-if="anyDefined(props.family.blanket_count)"><dt>عدد البطاطين</dt><dd>{{ formatValue(props.family.blanket_count, 'number') }}</dd></div>
        <div v-if="props.family.housing_condition_notes"><dt>ملاحظات حالة السكن</dt><dd>{{ props.family.housing_condition_notes }}</dd></div>
      </dl>
    </section>

    <section v-if="props.members.length > 0" class="print-section">
      <h2>أفراد الأسرة</h2>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>العمر</th>
            <th>صلة القرابة</th>
            <th>يعمل</th>
            <th>المستوى التعليمي</th>
            <th>تكلفة التعليم الشهرية</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in props.members" :key="m.member_id">
            <td>{{ m.name ?? '—' }}</td>
            <td>{{ formatValue(m.age, 'number') }}</td>
            <td>{{ m.relation ?? '—' }}</td>
            <td>{{ formatValue(m.is_working, 'bool') }}</td>
            <td>{{ m.education_level ?? '—' }}</td>
            <td>{{ formatValue(m.education_monthly_cost, 'money') }}</td>
            <td>{{ m.notes ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="props.income.length > 0" class="print-section">
      <h2>مصادر الدخل</h2>
      <table>
        <thead>
          <tr>
            <th>نوع المصدر</th>
            <th>التفاصيل</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in props.income" :key="i.income_id">
            <td>{{ i.source_type ?? '—' }}</td>
            <td>{{ i.source_detail ?? '—' }}</td>
            <td>{{ formatValue(i.amount, 'money') }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="paidExpenses.length > 0" class="print-section">
      <h2>المصروفات</h2>
      <table>
        <thead>
          <tr>
            <th>البند</th>
            <th>المبلغ</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ex in paidExpenses" :key="ex.expense_id">
            <td>{{ formatExpenseCategory(ex.category) }}</td>
            <td>{{ formatValue(ex.amount, 'money') }}</td>
            <td>{{ ex.notes ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="hasTotalsData" class="print-section">
      <h2>الإجماليات المصرح بها</h2>
      <dl class="print-fields">
        <div v-if="anyDefined(props.family.declared_income)"><dt>الدخل المصرح به</dt><dd>{{ formatValue(props.family.declared_income, 'money') }}</dd></div>
        <div v-if="anyDefined(props.family.declared_expenses)"><dt>المصروفات المصرح بها</dt><dd>{{ formatValue(props.family.declared_expenses, 'money') }}</dd></div>
        <div v-if="props.family.deficit_note"><dt>ملاحظة العجز</dt><dd>{{ props.family.deficit_note }}</dd></div>
        <div v-if="props.family.deficit_coping"><dt>طريقة التعامل مع العجز</dt><dd>{{ props.family.deficit_coping }}</dd></div>
      </dl>
    </section>

    <section v-if="activeNeeds.length > 0" class="print-section">
      <h2>الاحتياجات</h2>
      <ul>
        <li v-for="n in activeNeeds" :key="n.need_id">
          {{ n.label }}<span v-if="n.note"> — {{ n.note }}</span>
        </li>
      </ul>
    </section>

    <section v-if="hasNotesData" class="print-section">
      <h2>ملاحظات</h2>
      <dl class="print-fields">
        <div v-if="props.family.general_notes"><dt>ملاحظات عامة</dt><dd>{{ props.family.general_notes }}</dd></div>
        <div v-if="props.family.head_notes"><dt>ملاحظات عن رب الأسرة</dt><dd>{{ props.family.head_notes }}</dd></div>
        <div v-if="props.family.spouse_notes"><dt>ملاحظات عن الزوج/الزوجة</dt><dd>{{ props.family.spouse_notes }}</dd></div>
      </dl>
    </section>

    <footer class="print-section print-footer">
      <div class="print-signature">توقيع المسؤول: ______________________</div>
    </footer>
  </div>
</template>
