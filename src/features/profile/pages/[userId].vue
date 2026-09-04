<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '@/store'
import {
  useProfile,
  updateMyProfile,
  uploadMyAvatar,
  type ProfileUpdatePayload,
} from '@/features/profile/composables/useProfile'
import { usePermissionsCatalog } from '@/features/permissions/composables/usePermissionsCatalog'
import { USERNAME_PATTERN } from '@/features/auth/composables/useUsernameAvailability'
import ActivityGrid from '@/features/timesheet/components/ActivityGrid.vue'

const route = useRoute()
const store = useStore()

const userId = computed(() => (route.params as Record<string, string>).userId!)
const isSelf = computed(() => userId.value === store.userId)

const { profile, avatarUrl, notFound, loading, error, reload } = useProfile(userId)
const { labelFor, loading: catalogLoading } = usePermissionsCatalog()

const statusLabel = (status: string) =>
  ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' })[status] ?? status
const statusColor = (status: string) =>
  status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'

const form = ref({
  full_name: '',
  username: '',
  phone: '',
  email: '',
  area: '',
  birth_date: '',
  education: '',
  job: '',
})

watch(
  profile,
  (p) => {
    if (!p) return
    form.value = {
      full_name: p.full_name ?? '',
      username: p.username ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      area: p.area ?? '',
      birth_date: p.birth_date ?? '',
      education: p.education ?? '',
      job: p.job ?? '',
    }
  },
  { immediate: true },
)

const canSave = computed(
  () => USERNAME_PATTERN.test(form.value.username.trim()) && form.value.full_name.trim().length > 0,
)

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function onSave() {
  if (!profile.value || !canSave.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    const payload: ProfileUpdatePayload = {
      full_name: form.value.full_name.trim(),
      username: form.value.username.trim(),
      phone: form.value.phone.trim() || null,
      email: form.value.email.trim() || null,
      area: form.value.area.trim() || null,
      birth_date: form.value.birth_date || null,
      education: form.value.education.trim() || null,
      job: form.value.job.trim() || null,
    }
    await updateMyProfile(profile.value.user_id, payload)
    await reload()
    await store.refreshSession(profile.value.user_id)
    saveSuccess.value = true
  } catch (e) {
    saveError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني.')
  } finally {
    saving.value = false
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !profile.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    await uploadMyAvatar(profile.value.user_id, file)
    await reload()
  } catch (err) {
    uploadError.value = toUserMessage(err, 'حصلت مشكلة في رفع الصورة.')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <template v-if="loading">
      <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <USkeleton class="h-56 w-full" />
        <div class="space-y-4">
          <USkeleton class="h-40 w-full" />
          <USkeleton class="h-56 w-full" />
        </div>
      </div>
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">الصفحة غير موجودة</p>
    </div>

    <div v-else-if="profile" class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <!-- Identity: avatar, name, status, own permissions — read-only, stays put while the form scrolls. -->
      <UCard class="lg:sticky lg:top-4">
        <div class="flex flex-row lg:flex-col items-center gap-4 lg:gap-3 text-center">
          <div class="relative shrink-0">
            <UAvatar
              :src="avatarUrl ?? undefined"
              :alt="profile.full_name ?? profile.username"
              size="3xl"
            />
            <template v-if="isSelf">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onAvatarChange"
              />
              <UButton
                icon="i-lucide-camera"
                size="sm"
                color="neutral"
                variant="solid"
                class="absolute -bottom-1 -left-1 rounded-full ring-2 ring-default"
                :loading="uploading"
                @click="fileInput?.click()"
              />
            </template>
          </div>

          <div class="min-w-0 text-start lg:text-center">
            <h1 class="text-lg font-bold truncate">{{ profile.full_name || profile.username }}</h1>
            <p class="text-sm text-dimmed truncate">@{{ profile.username }}</p>
            <UBadge :color="statusColor(profile.status)" variant="subtle" class="mt-2">
              {{ statusLabel(profile.status) }}
            </UBadge>
          </div>
        </div>

        <UAlert
          v-if="uploadError"
          color="error"
          variant="subtle"
          :title="uploadError"
          icon="i-lucide-alert-circle"
          class="mt-4"
        />

        <template v-if="isSelf && !catalogLoading">
          <USeparator class="my-4" />
          <p class="text-xs font-medium text-dimmed mx-2">الصلاحيات</p>
          <div
            v-if="store.perms.length"
            class="flex flex-wrap gap-1.5 justify-center lg:justify-start p-2"
          >
            <UBadge
              v-for="code in store.perms"
              :key="code"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ labelFor(code) }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-dimmed">مفيش صلاحيات على حسابك دلوقتي.</p>
        </template>
      </UCard>

      <!-- Editable (self) / read-only (viewing someone else) details. -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">النشاط</h2>
          </template>
          <ActivityGrid :user-id="profile.user_id" />
        </UCard>

        <form v-if="isSelf" class="space-y-4" @submit.prevent="onSave">
          <UCard>
            <template #header>
              <h2 class="font-semibold">بيانات تسجيل الدخول</h2>
            </template>

            <UAlert
              color="warning"
              variant="subtle"
              icon="i-lucide-info"
              title="دي بيانات تسجيل الدخول"
              description="لو غيّرت أي حاجة منها هتدخل بالجديد بعد كده."
              class="mb-4"
            />

            <div class="grid sm:grid-cols-2 gap-4 p-2">
              <UFormField label="اسم المستخدم">
                <UInput
                  v-model="form.username"
                  icon="i-lucide-at-sign"
                  class="w-full"
                  autocomplete="username"
                />
              </UFormField>

              <UFormField label="رقم الموبايل">
                <UInput
                  v-model="form.phone"
                  icon="i-lucide-phone"
                  class="w-full"
                  autocomplete="tel"
                />
              </UFormField>

              <UFormField label="الإيميل" class="sm:col-span-2">
                <UInput
                  v-model="form.email"
                  type="email"
                  icon="i-lucide-mail"
                  class="w-full"
                  autocomplete="email"
                />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold">البيانات الشخصية</h2>
            </template>

            <div class="grid sm:grid-cols-2 gap-4 p-2">
              <UFormField label="الاسم بالكامل" class="sm:col-span-2">
                <UInput v-model="form.full_name" icon="i-lucide-user" class="w-full" />
              </UFormField>

              <UFormField label="المنطقة">
                <UInput v-model="form.area" icon="i-lucide-map-pin" class="w-full" />
              </UFormField>

              <UFormField label="تاريخ الميلاد">
                <UInput
                  v-model="form.birth_date"
                  type="date"
                  icon="i-lucide-calendar"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="المؤهل الدراسي">
                <UInput v-model="form.education" icon="i-lucide-graduation-cap" class="w-full" />
              </UFormField>

              <UFormField label="الوظيفة">
                <UInput v-model="form.job" icon="i-lucide-briefcase" class="w-full" />
              </UFormField>
            </div>
          </UCard>

          <UAlert
            v-if="saveError"
            color="error"
            variant="subtle"
            :title="saveError"
            icon="i-lucide-alert-circle"
          />
          <UAlert
            v-if="saveSuccess"
            color="success"
            variant="subtle"
            title="اتحفظ بنجاح"
            icon="i-lucide-check-circle"
          />

          <div class="flex justify-end">
            <UButton type="submit" size="lg" :loading="saving" :disabled="!canSave">
              حفظ التعديلات
            </UButton>
          </div>
        </form>

        <UCard v-else>
          <template #header>
            <h2 class="font-semibold">البيانات الشخصية</h2>
          </template>

          <div class="grid sm:grid-cols-2 gap-4 p-2">
            <div v-if="profile.area" class="flex items-start gap-2">
              <UIcon name="i-lucide-map-pin" class="text-dimmed size-4 mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-dimmed">المنطقة</p>
                <p>{{ profile.area }}</p>
              </div>
            </div>
            <div v-if="profile.education" class="flex items-start gap-2">
              <UIcon name="i-lucide-graduation-cap" class="text-dimmed size-4 mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-dimmed">المؤهل الدراسي</p>
                <p>{{ profile.education }}</p>
              </div>
            </div>
            <div v-if="profile.job" class="flex items-start gap-2">
              <UIcon name="i-lucide-briefcase" class="text-dimmed size-4 mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-dimmed">الوظيفة</p>
                <p>{{ profile.job }}</p>
              </div>
            </div>
            <p
              v-if="!profile.area && !profile.education && !profile.job"
              class="text-dimmed text-sm"
            >
              لا توجد بيانات إضافية
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
