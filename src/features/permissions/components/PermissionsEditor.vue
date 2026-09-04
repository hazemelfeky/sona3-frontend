<script setup lang="ts">
import { isOfflineError, OFFLINE_MESSAGE } from '@/utils/errors'
import { toUserMessage } from '@/utils/errors'
import { ref, watch } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { useStore } from '@/store'
import { usePermissionsCatalog } from '@/features/permissions/composables/usePermissionsCatalog'
import type { Database } from '@/types/db'

type MemberRow = Database['public']['Views']['v_users_with_perms']['Row']

const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ saved: [] }>()

const store = useStore()
const { grouped, templates, loading: catalogLoading } = usePermissionsCatalog()

const member = ref<MemberRow | null>(null)
const loading = ref(true)
const loadError = ref('')
const checked = ref<Set<string>>(new Set())

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error } = await supabase
      .from('v_users_with_perms')
      .select('*')
      .eq('user_id', props.userId)
      .maybeSingle<MemberRow>()
    if (error) throw error

    member.value = data
    checked.value = new Set(data?.perms ?? [])
  } catch (e) {
    loadError.value = toUserMessage(e, 'حصلت مشكلة أثناء التحميل')
  } finally {
    loading.value = false
  }
}
watch(() => props.userId, load, { immediate: true })

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
  if (isOfflineError(error)) return OFFLINE_MESSAGE
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (raw.includes('NO_PERMISSION')) return 'مش معاك صلاحية للإجراء ده'
  if (raw.includes('LAST_ADMIN_PROTECTED')) return 'ماينفعش تشيل صلاحية منح الصلاحيات من آخر مسؤول'
  return 'حصلت مشكلة. حاول تاني.'
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
    if (member.value.user_id === store.userId) await store.refreshSession(store.userId!)
    emit('saved')
  } catch (e) {
    actionError.value = translateActionError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">الصلاحيات</h2>
    </template>

    <template v-if="loading || catalogLoading">
      <USkeleton class="h-48 w-full" />
    </template>

    <UAlert v-else-if="loadError" color="error" variant="subtle" :title="loadError" icon="i-lucide-alert-circle" />

    <template v-else-if="member">
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

      <div class="mt-6">
        <UButton label="حفظ الصلاحيات" :loading="saving" @click="onSavePerms" />
      </div>
    </template>
  </UCard>
</template>
