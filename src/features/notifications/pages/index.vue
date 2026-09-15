<route lang="yaml">
meta:
  requiresPerm: notifications.send
</route>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSendPush, useUserOptions } from '@/features/notifications/composables/useSendPush'
import PushToggle from '@/components/PushToggle.vue'

const { options, loading: usersLoading, error: usersError } = useUserOptions()
const { sending, summary, error, send } = useSendPush()

const userId = ref<string | undefined>(undefined)
const title = ref('')
const body = ref('')

const TITLE_MAX = 120
const BODY_MAX = 1000

const canSend = computed(
  () =>
    !!userId.value &&
    title.value.trim().length > 0 &&
    title.value.length <= TITLE_MAX &&
    body.value.trim().length > 0 &&
    body.value.length <= BODY_MAX &&
    !sending.value,
)

const selectedLabel = computed(() => options.value.find((o) => o.user_id === userId.value)?.label ?? '')

async function onSubmit() {
  if (!canSend.value || !userId.value) return
  await send({ user_id: userId.value, title: title.value.trim(), body: body.value.trim() })
}

const resultColor = computed(() => {
  const s = summary.value
  if (!s) return 'neutral'
  if (s.sent > 0 && s.failed === 0) return 'success'
  if (s.sent > 0) return 'warning'
  return 'error'
})

const resultTitle = computed(() => {
  const s = summary.value
  if (!s) return ''
  if (s.subscriptions === 0) return `${selectedLabel.value || 'المستخدم'} مش مفعّل الإشعارات على أي جهاز`
  if (s.sent > 0 && s.failed === 0) return 'تم إرسال الإشعار بنجاح'
  if (s.sent > 0) return 'تم الإرسال لبعض الأجهزة وفشل للبعض'
  return 'فشل إرسال الإشعار'
})
</script>

<template>
  <div dir="rtl" class="max-w-2xl mx-auto space-y-4">
    <div class="flex items-center gap-3">
      <div class="flex size-10 items-center justify-center rounded-xl bg-[#12385D] text-white">
        <UIcon name="i-lucide-bell-ring" class="size-5" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold">إرسال إشعار</h1>
        <p class="text-sm text-dimmed">ابعت إشعار فوري لمستخدم معيّن على كل أجهزته المفعّلة.</p>
      </div>
    </div>

    <UCard>
      <form class="space-y-4 p-4 sm:p-6" @submit.prevent="onSubmit">
        <UFormField label="المستخدم" required>
          <UAlert v-if="usersError" color="error" variant="subtle" :title="usersError" icon="i-lucide-alert-circle" />
          <USelectMenu
            v-else
            v-model="userId"
            searchable
            :items="options"
            :loading="usersLoading"
            value-key="user_id"
            label-key="label"
            placeholder="ابحث واختار مستخدم"
            class="w-full"
          >
            <template #item-label="{ item }">
              <span>{{ item.label }}</span>
              <span v-if="item.username" class="text-dimmed text-xs ms-2">@{{ item.username }}</span>
            </template>
          </USelectMenu>
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
          <UButton type="submit" icon="i-lucide-send" color="primary" :loading="sending" :disabled="!canSend">
            إرسال
          </UButton>
        </div>
      </form>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" title="فشل الإرسال" :description="error" />

    <UAlert
      v-else-if="summary"
      :color="resultColor"
      variant="subtle"
      :icon="resultColor === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
      :title="resultTitle"
    >
      <template #description>
        <ul class="mt-1 space-y-0.5 text-sm">
          <li>عدد الأجهزة المسجّلة: {{ summary.subscriptions }}</li>
          <li>اتبعت بنجاح: {{ summary.sent }}</li>
          <li>فشل: {{ summary.failed }}</li>
          <li v-if="summary.removed_expired">اشتراكات منتهية واتمسحت: {{ summary.removed_expired }}</li>
        </ul>
      </template>
    </UAlert>

    <UCard>
      <div class="p-4 sm:p-6">
        <PushToggle />
      </div>
    </UCard>
  </div>
</template>
