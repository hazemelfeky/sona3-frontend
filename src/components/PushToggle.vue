<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/composables/useNotifications'
import { toUserMessage } from '@/utils/errors'

const supported = isPushSupported()
const subscribed = ref(false)
const checking = ref(true)
const busy = ref(false)
const error = ref('')
const denied = ref(supported && Notification.permission === 'denied')

onMounted(async () => {
  try {
    subscribed.value = !!(await getCurrentSubscription())
  } finally {
    checking.value = false
  }
})

async function enable() {
  busy.value = true
  error.value = ''
  try {
    await subscribeToPush()
    subscribed.value = true
  } catch (e) {
    error.value = toUserMessage(e, 'تعذّر تفعيل الإشعارات')
  } finally {
    denied.value = supported && Notification.permission === 'denied'
    busy.value = false
  }
}

async function disable() {
  busy.value = true
  error.value = ''
  try {
    await unsubscribeFromPush()
    subscribed.value = false
  } catch (e) {
    error.value = toUserMessage(e, 'تعذّر إلغاء الإشعارات')
    subscribed.value = !!(await getCurrentSubscription())
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div dir="rtl" class="space-y-2">
    <p class="text-xs font-medium text-dimmed mx-2">الإشعارات على الجهاز ده</p>

    <p v-if="!supported" class="text-sm text-dimmed">
      الإشعارات مش مدعومة هنا. على الآيفون ثبّت التطبيق على الشاشة الرئيسية الأول (iOS 16.4 أو أحدث).
    </p>

    <template v-else>
      <USkeleton v-if="checking" class="h-9 w-full" />

      <div v-else class="flex flex-wrap items-center gap-2">
        <UBadge :color="subscribed ? 'success' : 'neutral'" variant="subtle">
          {{ subscribed ? 'مفعّلة' : 'غير مفعّلة' }}
        </UBadge>

        <UButton
          v-if="!subscribed"
          icon="i-lucide-bell-ring"
          color="primary"
          size="sm"
          :loading="busy"
          :disabled="denied"
          @click="enable"
        >
          تفعيل الإشعارات
        </UButton>
        <UButton
          v-else
          icon="i-lucide-bell-off"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="busy"
          @click="disable"
        >
          إلغاء
        </UButton>
      </div>

      <p v-if="denied" class="text-xs text-warning">
        الإذن مرفوض من المتصفح. فعّله من إعدادات الموقع/التطبيق وارجع جرّب تاني.
      </p>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />
  </div>
</template>
