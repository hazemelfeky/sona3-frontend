<route lang="yaml">
meta:
  bare: true
</route>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useStore } from '@/store'

const router = useRouter()
const store = useStore()

async function logout() {
  await store.signOut()
  router.push('/auth/login')
}
</script>

<template>
  <UCard>
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <UIcon name="i-lucide-x-circle" class="size-10 text-error" />
      <h1 class="text-lg font-bold">تم رفض طلبك</h1>
      <p class="text-sm text-dimmed">للأسف مش هتقدر تدخل بالحساب ده. تواصل معانا لو عندك استفسار.</p>
      <UButton variant="ghost" color="neutral" @click="logout">تسجيل الخروج</UButton>
    </div>
  </UCard>
</template>
