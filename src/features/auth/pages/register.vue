<route lang="yaml">
meta:
  bare: true
</route>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import { useUsernameAvailability } from '@/features/auth/composables/useUsernameAvailability'

const router = useRouter()
const store = useStore()

const username = ref('')
const fullName = ref('')
const password = ref('')
const phone = ref('')
const email = ref('')
const area = ref('')

const submitting = ref(false)
const errorMessage = ref('')

const { status: usernameStatus, onInput: checkUsername } = useUsernameAvailability()
watch(username, (value) => checkUsername(value.trim()))

const usernameHint = computed(() => {
  switch (usernameStatus.value) {
    case 'available':
      return { text: '✅ متاح', class: 'text-success' }
    case 'taken':
      return { text: '❌ مستخدم', class: 'text-error' }
    case 'invalid':
      return { text: '⚠️ الشكل غلط', class: 'text-warning' }
    case 'checking':
      return { text: 'بيتحقق...', class: 'text-dimmed' }
    default:
      return null
  }
})

const canSubmit = computed(
  () =>
    usernameStatus.value === 'available' &&
    fullName.value.trim().length > 0 &&
    password.value.length >= 6 &&
    !submitting.value,
)

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await store.signUp({
      username: username.value.trim(),
      fullName: fullName.value.trim(),
      password: password.value,
      phone: phone.value.trim() || undefined,
      email: email.value.trim() || undefined,
      area: area.value.trim() || undefined,
    })
    router.push('/auth/pending')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'حصلت مشكلة. حاول تاني.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-bold">إنشاء حساب</h1>
    </template>

    <form class="space-y-4 p-2" @submit.prevent="onSubmit">
      <UFormField label="اسم المستخدم">
        <UInput
          v-model="username"
          class="w-full"
          placeholder="ahmed_test"
          autocomplete="username"
          :disabled="submitting"
        />
        <p v-if="usernameHint" class="text-xs mt-1" :class="usernameHint.class">{{ usernameHint.text }}</p>
      </UFormField>
      <p class="text-xs text-dimmed -mt-2">
        ده اللي هتسجّل بيه الدخول. تقدر كمان تدخل برقم موبايلك أو إيميلك لو كتبتهم.
      </p>

      <UFormField label="الاسم بالكامل">
        <UInput v-model="fullName" class="w-full" :disabled="submitting" />
      </UFormField>

      <UFormField label="كلمة المرور">
        <UInput
          v-model="password"
          type="password"
          class="w-full"
          autocomplete="new-password"
          :disabled="submitting"
        />
      </UFormField>

      <UFormField label="رقم الموبايل (اختياري)">
        <UInput v-model="phone" class="w-full" autocomplete="tel" :disabled="submitting" />
      </UFormField>

      <UFormField label="الإيميل (اختياري)">
        <UInput v-model="email" type="email" class="w-full" autocomplete="email" :disabled="submitting" />
      </UFormField>

      <UFormField label="المنطقة (اختياري)">
        <UInput v-model="area" class="w-full" :disabled="submitting" />
      </UFormField>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />

      <UButton type="submit" block :loading="submitting" :disabled="!canSubmit"> تسجيل </UButton>

      <p class="text-sm text-center text-dimmed">
        عندك حساب؟
        <RouterLink to="/auth/login" class="text-primary">سجّل دخول</RouterLink>
      </p>
    </form>
  </UCard>
</template>
