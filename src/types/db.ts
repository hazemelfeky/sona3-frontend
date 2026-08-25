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
          id_number: string | null
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
          status: string | null
        }
        Insert: Partial<Database['public']['Tables']['family_needs']['Row']>
        Update: Partial<Database['public']['Tables']['family_needs']['Row']>
      }
      profiles: {
        Row: {
          user_id: string
          username: string
          full_name: string | null
          phone: string | null
          email: string | null
          area: string | null
          birth_date: string | null
          education: string | null
          job: string | null
          avatar_path: string | null
          status: 'pending' | 'approved' | 'rejected'
          admin_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          auth_email: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      permissions: {
        Row: {
          code: string
          label_ar: string
          category: string
          description: string | null
          sort_order: number
        }
        Insert: Partial<Database['public']['Tables']['permissions']['Row']> & { code: string }
        Update: Partial<Database['public']['Tables']['permissions']['Row']>
      }
      permission_templates: {
        Row: {
          name_ar: string
          perm_codes: string[]
        }
        Insert: Partial<Database['public']['Tables']['permission_templates']['Row']>
        Update: Partial<Database['public']['Tables']['permission_templates']['Row']>
      }
      family_groups: {
        Row: {
          group_id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['family_groups']['Row']> & { name: string; created_by: string }
        Update: Partial<Database['public']['Tables']['family_groups']['Row']>
      }
      family_group_members: {
        Row: {
          group_id: string
          family_id: number
          added_at: string
        }
        Insert: Partial<Database['public']['Tables']['family_group_members']['Row']> & {
          group_id: string
          family_id: number
        }
        Update: Partial<Database['public']['Tables']['family_group_members']['Row']>
      }
      volunteer_assessments: {
        Row: {
          assessment_id: number
          user_id: string
          commitment: number | null
          attendance: number | null
          quality: number | null
          communication: number | null
          teamwork: number | null
          initiative: number | null
          strengths: string | null
          development: string | null
          ready_for_more: boolean | null
          next_step: string | null
          assessed_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['volunteer_assessments']['Row']> & {
          user_id: string
          commitment: number
          attendance: number
          quality: number
          communication: number
          teamwork: number
          initiative: number
        }
        Update: Partial<Database['public']['Tables']['volunteer_assessments']['Row']>
      }
      volunteer_notes: {
        Row: {
          note_id: number
          user_id: string
          body: string
          author_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['volunteer_notes']['Row']> & {
          user_id: string
          body: string
        }
        Update: Partial<Database['public']['Tables']['volunteer_notes']['Row']>
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
          search_text: string | null
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
      v_users_with_perms: {
        Row: {
          user_id: string
          username: string
          full_name: string | null
          area: string | null
          status: 'pending' | 'approved' | 'rejected'
          perms: string[]
        }
      }
      v_volunteers: {
        Row: {
          user_id: string
          username: string
          full_name: string | null
          phone: string | null
          area: string | null
          status: 'pending' | 'approved' | 'rejected'
          volunteer_state: string | null
          team: string | null
          avatar_path: string | null
          created_at: string | null
          age: number | null
          search_text: string | null
        }
      }
      v_user_directory: {
        Row: {
          user_id: string
          username: string | null
          full_name: string | null
          avatar_path: string | null
        }
      }
    }
  }
}
