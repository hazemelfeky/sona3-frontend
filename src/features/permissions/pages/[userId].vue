<route lang="yaml">
meta:
  requiresPerm: users.permissions
</route>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import PermissionsEditor from '@/features/permissions/components/PermissionsEditor.vue'
import ReviewActions from '@/features/permissions/components/ReviewActions.vue'
import type { Database } from '@/types/db'

type MemberRow = Database['public']['Views']['v_users_with_perms']['Row']

const route = useRoute()
const userId = computed(() => (route.params as Record<string, string>).userId!)

const member = ref<MemberRow | null>(null)
const notFound = ref(false)
const loading = ref(true)
const loadError = ref('')

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
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'حصلت مشكلة أثناء التحميل'
  } finally {
    loading.value = false
  }
}
watch(userId, load, { immediate: true })
</script>

<template>
  <div class="max-w-2xl space-y-4">
    <UButton to="/permissions" variant="ghost" color="neutral" icon="i-lucide-arrow-right" label="رجوع لقائمة الأعضاء" />

    <template v-if="loading">
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

      <ReviewActions :user-id="member.user_id" :status="member.status" @reviewed="load" />

      <PermissionsEditor :user-id="member.user_id" />
    </template>
  </div>
</template>
