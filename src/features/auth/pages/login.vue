<route lang="yaml">
meta:
  bare: true
</route>

<script setup lang="ts">
import { toUserMessage } from '@/utils/errors'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'

const router = useRouter()
const store = useStore()

const identifier = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const canSubmit = computed(
  () => identifier.value.trim().length > 0 && password.value.length > 0 && !submitting.value,
)

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await store.signIn(identifier.value.trim(), password.value)
    if (store.status === 'pending') router.push('/auth/pending')
    else if (store.status === 'rejected') router.push('/auth/rejected')
    else router.push('/dashboard')
  } catch (error) {
    errorMessage.value = toUserMessage(error, 'بيانات الدخول غير صحيحة')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-bold">تسجيل الدخول</h1>
    </template>

    <form class="space-y-4 p-2" @submit.prevent="onSubmit">
      <UFormField label="اسم المستخدم أو رقم الموبايل أو الإيميل">
        <UInput v-model="identifier" class="w-full" autocomplete="username" />
      </UFormField>

      <UFormField label="كلمة المرور">
        <UInput v-model="password" type="password" class="w-full" autocomplete="current-password" />
      </UFormField>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />

      <UButton type="submit" block :loading="submitting" :disabled="!canSubmit"> دخول </UButton>

      <p class="text-sm text-center text-dimmed">
        ملكش حساب؟
        <RouterLink to="/auth/register" class="text-primary">سجّل واحد جديد</RouterLink>
      </p>
    </form>
  </UCard>
</template>
