<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase, db } from '@/lib/supabase'
import { useStore } from '@/store'
import { usePermissionsCatalog } from '@/features/permissions/composables/usePermissionsCatalog'
import type { Database } from '@/types/db'

type MemberRow = Database['public']['Views']['v_users_with_perms']['Row']

const route = useRoute()
const router = useRouter()
const store = useStore()

const userId = computed(() => (route.params as Record<string, string>).userId!)

const { grouped, templates, loading: catalogLoading } = usePermissionsCatalog()

const member = ref<MemberRow | null>(null)
const notFound = ref(false)
const loading = ref(true)
const loadError = ref('')

const checked = ref<Set<string>>(new Set())
const adminNote = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    const { data, error } = await supabase
      .from('v_users_with_perms')
      .select('*')
      .eq('user_id', userId.value)
      .maybeSingle<MemberRow>()
    if (error) throw error

    if (!data) {
      notFound.value = true
      member.value = null
      return
    }

    member.value = data
    checked.value = new Set(data.perms)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'حصلت مشكلة أثناء التحميل'
  } finally {
    loading.value = false
  }
}
watch(userId, load, { immediate: true })

function toggle(code: string) {
  const next = new Set(checked.value)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  checked.value = next
}

function applyTemplate(codes: string[]) {
  checked.value = new Set(codes)
}

const saving = ref(false)
const actionError = ref('')

function translateActionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (raw.includes('NO_PERMISSION')) return 'مش معاك صلاحية للإجراء ده'
  if (raw.includes('LAST_ADMIN_PROTECTED')) return 'ماينفعش تشيل صلاحية منح الصلاحيات من آخر مسؤول'
  return 'حصلت مشكلة. حاول تاني.'
}

async function refreshOwnPermsIfSelf() {
  if (member.value?.user_id === store.userId) await store.refreshSession(store.userId!)
}

async function onSavePerms() {
  if (!member.value) return
  saving.value = true
  actionError.value = ''
  try {
    const { error } = (await db.rpc('set_user_permissions', {
      target_user: member.value.user_id,
      perm_codes: Array.from(checked.value),
    })) as { error: { message: string } | null }
    if (error) throw error

    await load()
    await refreshOwnPermsIfSelf()
  } catch (e) {
    actionError.value = translateActionError(e)
  } finally {
    saving.value = false
  }
}

async function onReview(newStatus: 'approved' | 'rejected') {
  if (!member.value) return
  saving.value = true
  actionError.value = ''
  try {
    const { error } = (await db.rpc('review_and_grant', {
      target_user: member.value.user_id,
      new_status: newStatus,
      perm_codes: Array.from(checked.value),
      note: adminNote.value.trim() || null,
    })) as { error: { message: string } | null }
    if (error) throw error

    await refreshOwnPermsIfSelf()
    router.push('/permissions')
  } catch (e) {
    actionError.value = translateActionError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-4">
    <UButton to="/permissions" variant="ghost" color="neutral" icon="i-lucide-arrow-right" label="رجوع لقائمة الأعضاء" />

    <template v-if="loading || catalogLoading">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-64 w-full" />
    </template>

    <UAlert v-else-if="loadError" color="error" variant="subtle" :title="loadError" icon="i-lucide-alert-circle" />

    <div v-else-if="notFound" class="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">الصفحة غير موجودة</p>
    </div>

    <template v-else-if="member">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-bold">{{ member.full_name || member.username }}</h1>
            <p class="text-sm text-dimmed">@{{ member.username }} · {{ member.area || '—' }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">الصلاحيات</h2>
        </template>

        <div v-if="templates.length" class="mb-4 flex flex-wrap gap-2">
          <UButton
            v-for="tpl in templates"
            :key="tpl.name_ar"
            :label="tpl.name_ar"
            size="sm"
            variant="soft"
            color="neutral"
            @click="applyTemplate(tpl.perm_codes)"
          />
        </div>

        <div class="space-y-5">
          <div v-for="group in grouped" :key="group.category">
            <h3 class="text-sm font-medium text-dimmed mb-2">{{ group.category }}</h3>
            <div class="space-y-2">
              <UCheckbox
                v-for="perm in group.items"
                :key="perm.code"
                :model-value="checked.has(perm.code)"
                :label="perm.label_ar"
                :description="perm.description ?? undefined"
                @update:model-value="toggle(perm.code)"
              />
            </div>
          </div>
        </div>

        <UAlert
          v-if="actionError"
          color="error"
          variant="subtle"
          :title="actionError"
          icon="i-lucide-alert-circle"
          class="mt-4"
        />

        <div class="flex flex-wrap items-center gap-2 mt-6">
          <UButton label="حفظ الصلاحيات" :loading="saving" @click="onSavePerms" />

          <template v-if="member.status === 'pending'">
            <UButton label="قبول العضو" color="success" :loading="saving" @click="onReview('approved')" />
            <UButton label="رفض العضو" color="error" variant="soft" :loading="saving" @click="onReview('rejected')" />
          </template>
        </div>

        <UFormField v-if="member.status === 'pending'" label="ملاحظة (اختياري)" class="mt-4">
          <UTextarea v-model="adminNote" class="w-full" :rows="2" />
        </UFormField>
      </UCard>
    </template>
  </div>
</template>
