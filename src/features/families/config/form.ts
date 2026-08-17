export interface FormFieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'tel' | 'date' | 'select' | 'textarea'
  options?: readonly string[] // for type: 'select'
  placeholder?: string
  rows?: number // for type: 'textarea', default 2
}

export interface FormSectionDef {
  title: string
  prefix?: string // combined with each field's key to index FamilyFormState (e.g. 'head_' + 'name')
  fields: readonly FormFieldDef[]
}

// head_* and spouse_* are the same seven fields, applied via a prefix per section.
const personFields = [
  { key: 'name', label: 'الاسم', type: 'text' },
  { key: 'age', label: 'العمر', type: 'number' },
  { key: 'phone', label: 'الهاتف', type: 'tel' },
  { key: 'occupation', label: 'المهنة', type: 'text' },
  { key: 'education', label: 'التعليم', type: 'text' },
  { key: 'status', label: 'الحالة', type: 'text' },
  { key: 'notes', label: 'ملاحظات', type: 'textarea' },
] as const satisfies readonly FormFieldDef[]

export const familyFormSections: readonly FormSectionDef[] = [
  {
    title: 'بيانات عامة',
    fields: [
      { key: 'area', label: 'المنطقة', type: 'text' },
      { key: 'address', label: 'العنوان', type: 'text' },
      { key: 'registration_date', label: 'تاريخ التسجيل', type: 'date' },
      {
        key: 'evaluation_status',
        label: 'حالة التقييم',
        type: 'select',
        options: ['مقبولة', 'مرفوضة', 'مؤجلة'],
        placeholder: 'اختر الحالة',
      },
    ],
  },
  {
    title: 'رب الأسرة',
    prefix: 'head_',
    fields: personFields,
  },
  {
    title: 'الزوج/الزوجة',
    prefix: 'spouse_',
    fields: personFields,
  },
  {
    title: 'السكن',
    fields: [
      { key: 'housing_type', label: 'نوع السكن', type: 'text' },
      { key: 'blanket_count', label: 'عدد البطاطين', type: 'number' },
      { key: 'housing_condition_notes', label: 'ملاحظات حالة السكن', type: 'textarea' },
    ],
  },
  {
    title: 'الإجماليات المصرح بها',
    fields: [
      { key: 'declared_income', label: 'الدخل المصرح به', type: 'number' },
      { key: 'declared_expenses', label: 'المصروفات المصرح بها', type: 'number' },
      { key: 'deficit_note', label: 'ملاحظة العجز', type: 'text' },
      { key: 'deficit_coping', label: 'طريقة التعامل مع العجز', type: 'text' },
    ],
  },
  {
    title: 'ملاحظات عامة',
    fields: [{ key: 'general_notes', label: '', type: 'textarea', rows: 3 }],
  },
]
