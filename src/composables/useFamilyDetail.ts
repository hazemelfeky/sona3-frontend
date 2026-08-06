import { ref, watch, type Ref } from 'vue'
import { supabase, warnIfEmptyFromRls } from '@/lib/supabase'
import type { Database } from '@/types/db'

type Family = Database['public']['Tables']['families']['Row']
type Member = Database['public']['Tables']['members']['Row']
type IncomeSource = Database['public']['Tables']['income_sources']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type NeedType = Database['public']['Tables']['need_types']['Row']
type NeedRow = Database['public']['Tables']['family_needs']['Row']
export type FamilyNeed = NeedRow & { label: string }

export function useFamilyDetail(id: Ref<number>) {
  const family = ref<Family | null>(null)
  const members = ref<Member[]>([])
  const income = ref<IncomeSource[]>([])
  const expenses = ref<Expense[]>([])
  const needs = ref<FamilyNeed[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load(familyId: number) {
    if (!Number.isInteger(familyId) || familyId <= 0) {
      family.value = null
      loading.value = false
      return
    }

    loading.value = true
    error.value = null
    try {
      const [familyRes, membersRes, incomeRes, expensesRes, needsRes, needTypesRes] = await Promise.all([
        supabase.from('families').select('*').eq('family_id', familyId).maybeSingle(),
        supabase.from('members').select('*').eq('family_id', familyId),
        supabase.from('income_sources').select('*').eq('family_id', familyId),
        supabase.from('expenses').select('*').eq('family_id', familyId),
        supabase.from('family_needs').select('*').eq('family_id', familyId),
        supabase.from('need_types').select('*'),
      ])

      if (familyRes.error) throw familyRes.error
      if (membersRes.error) throw membersRes.error
      if (incomeRes.error) throw incomeRes.error
      if (expensesRes.error) throw expensesRes.error
      if (needsRes.error) throw needsRes.error
      if (needTypesRes.error) throw needTypesRes.error

      const needTypesByCode = new Map((needTypesRes.data ?? []).map((nt: NeedType) => [nt.code, nt]))

      family.value = familyRes.data
      members.value = membersRes.data ?? []
      income.value = incomeRes.data ?? []
      expenses.value = expensesRes.data ?? []
      needs.value = (needsRes.data ?? []).map((n: NeedRow) => ({
        ...n,
        label: needTypesByCode.get(n.need_code ?? '')?.label_ar ?? n.need_code ?? '—',
      }))

      warnIfEmptyFromRls('families', family.value === null, false)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء تحميل بيانات الأسرة'
      family.value = null
    } finally {
      loading.value = false
    }
  }

  watch(id, load, { immediate: true })

  return { family, members, income, expenses, needs, loading, error }
}
