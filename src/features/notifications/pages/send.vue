<route lang="yaml">
meta:
  requiresPerm: notifications.send
</route>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSendPush, useVolunteerOptions } from '@/features/notifications/composables/useSendPush'

const { options, loading: optionsLoading, error: optionsError } = useVolunteerOptions()
const { sending, summary, error, send } = useSendPush()

const TITLE_MAX = 120
const BODY_MAX = 1000

const userId = ref<string | undefined>(undefined)
const title = ref('')
const body = ref('')

const selected = computed(() => options.value.find((o) => o.user_id === userId.value) ?? null)

const canSend = computed(
  () =>
    !!userId.value &&
    title.value.trim().length > 0 &&
    body.value.trim().length > 0 &&
    !sending.value,
)

async function onSubmit() {
  if (!canSend.value || !userId.value) return
  await send({ user_id: userId.value, title: title.value.trim(), body: body.value.trim() })
}

const resultColor = computed(() => {
  const s = summary.value
  if (!s) return 'neutral' as const
  if (s.sent > 0 && s.failed === 0) return 'success' as const
  if (s.sent > 0) return 'warning' as const
  return 'error' as const
})

const resultTitle = computed(() => {
  const s = summary.value
  if (!s) return ''
  if (s.sent === 0 && s.failed === 0) return 'المتطوع مش مفعّل الإشعارات على أي جهاز'
  if (s.failed === 0) return 'تم إرسال الإشعار بنجاح'
  if (s.sent > 0) return 'اتبعت لبعض الأجهزة وفشل للبعض'
  return 'فشل إرسال الإشعار'
})
</script>

<template>
  <div dir="rtl" class="max-w-2xl mx-auto space-y-4">
    <div class="flex items-center gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#12385D] text-white">
        <UIcon name="i-lucide-send" class="size-5" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold">إرسال إشعار</h1>
        <p class="text-sm text-dimmed">ابعت إشعار فوري لمتطوع معيّن.</p>
      </div>
    </div>

    <UCard>
      <form class="space-y-4 p-4 sm:p-6" @submit.prevent="onSubmit">
        <UFormField label="المتطوع" required>
          <UAlert v-if="optionsError" color="error" variant="subtle" :title="optionsError" icon="i-lucide-alert-circle" />
          <USelectMenu
            v-else
            v-model="userId"
            :items="options"
            :loading="optionsLoading"
            :filter-fields="['label', 'email', 'username']"
            value-key="user_id"
            label-key="label"
            placeholder="ابحث بالاسم أو الإيميل"
            class="w-full"
          >
            <template #item-label="{ item }">
              <div class="flex min-w-0 flex-col text-start">
                <span class="truncate">{{ item.label }}</span>
                <span class="truncate text-xs text-dimmed" dir="ltr">{{ item.email || `@${item.username}` }}</span>
              </div>
            </template>
          </USelectMenu>
          <p v-if="selected" class="mt-1 text-xs text-dimmed" dir="ltr">
            {{ selected.email || `@${selected.username}` }}
          </p>
        </UFormField>

        <UFormField label="العنوان" required :hint="`${title.length}/${TITLE_MAX}`">
          <UInput v-model="title" :maxlength="TITLE_MAX" placeholder="مثلاً: تذكير بموعد التوزيع" class="w-full" />
        </UFormField>

        <UFormField label="نص الرسالة" required :hint="`${body.length}/${BODY_MAX}`">
          <UTextarea
            v-model="body"
            :maxlength="BODY_MAX"
            :rows="4"
            autoresize
            placeholder="اكتب نص الإشعار..."
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            type="submit"
            icon="i-lucide-send"
            class="bg-[#12385D] text-white"
            :loading="sending"
            :disabled="!canSend"
          >
            إرسال
          </UButton>
        </div>
      </form>
    </UCard>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="فشل الإرسال"
      :description="error"
    />

    <UAlert
      v-else-if="summary"
      :color="resultColor"
      variant="subtle"
      :icon="resultColor === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
      :title="resultTitle"
    >
      <template #description>
        <ul class="mt-1 space-y-0.5 text-sm">
          <li>نجح: {{ summary.sent }}</li>
          <li>فشل: {{ summary.failed }}</li>
        </ul>
      </template>
    </UAlert>
  </div>
</template>
