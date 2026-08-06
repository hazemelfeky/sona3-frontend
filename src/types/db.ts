// Hand-written to match the live schema described in docs/dashboard-plan.md
// and supabase/migrations/20260806120000_families_views.sql. Once the
// project is linked, regenerate with:
//   pnpm gen:types

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          family_id: number
          source_sheet: string | null
          row_id: number | null
          registration_date: string | null
          area: string | null
          address: string | null
          head_name: string | null
          head_age: number | null
          head_phone: string | null
          head_occupation: string | null
          head_education: string | null
          head_status: string | null
          head_notes: string | null
          spouse_name: string | null
          spouse_age: number | null
          spouse_phone: string | null
          spouse_occupation: string | null
          spouse_education: string | null
          spouse_status: string | null
          spouse_notes: string | null
          member_count: number | null
          housing_type: string | null
          housing_condition_notes: string | null
          blanket_count: number | null
          needs_raw: string | null
          declared_expenses: number | null
          declared_income: number | null
          deficit_note: string | null
          deficit_coping: string | null
          evaluation_status: string | null
          general_notes: string | null
          confidence: string | null
          created_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['families']['Row']>
        Update: Partial<Database['public']['Tables']['families']['Row']>
      }
      members: {
        Row: {
          member_id: number
          family_id: number | null
          name: string | null
          age: number | null
          relation: string | null
          is_working: boolean | null
          education_level: string | null
          education_monthly_cost: number | null
          notes: string | null
        }
        Insert: Partial<Database['public']['Tables']['members']['Row']>
        Update: Partial<Database['public']['Tables']['members']['Row']>
      }
      income_sources: {
        Row: {
          income_id: number
          family_id: number | null
          source_type: string | null
          source_detail: string | null
          amount: number | null
        }
        Insert: Partial<Database['public']['Tables']['income_sources']['Row']>
        Update: Partial<Database['public']['Tables']['income_sources']['Row']>
      }
      expenses: {
        Row: {
          expense_id: number
          family_id: number | null
          category: string | null
          amount: number | null
          notes: string | null
        }
        Insert: Partial<Database['public']['Tables']['expenses']['Row']>
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
      }
      need_types: {
        Row: {
          code: string
          label_ar: string | null
          sort_order: number | null
        }
        Insert: Partial<Database['public']['Tables']['need_types']['Row']>
        Update: Partial<Database['public']['Tables']['need_types']['Row']>
      }
      family_needs: {
        Row: {
          need_id: number
          family_id: number | null
          need_code: string | null
          source: 'column' | 'inferred' | null
          note: string | null
        }
        Insert: Partial<Database['public']['Tables']['family_needs']['Row']>
        Update: Partial<Database['public']['Tables']['family_needs']['Row']>
      }
    }
    Views: {
      v_families_list: {
        Row: {
          family_id: number
          head_name: string | null
          area: string | null
          member_count: number | null
          evaluation_status: string | null
          confidence: string | null
          needs_raw: string | null
          needs_labels: string | null
          needs_count: number
          inferred_count: number
        }
      }
      v_families_stats: {
        Row: {
          total_families: number
          accepted_families: number
          rejected_families: number
          areas_count: number
          families_with_needs: number
        }
      }
      v_chart_families_by_area: {
        Row: {
          label: string
          value: number
        }
      }
      v_chart_needs_distribution: {
        Row: {
          label: string
          value: number
        }
      }
    }
  }
}
