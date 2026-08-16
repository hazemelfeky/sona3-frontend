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
      <UIcon name="i-lucide-clock" class="size-10 text-warning" />
      <h1 class="text-lg font-bold">حسابك قيد المراجعة</h1>
      <p class="text-sm text-dimmed">لسه بنراجع طلبك. هتقدر تدخل لما يتم قبول حسابك.</p>
      <UButton variant="ghost" color="neutral" @click="logout">تسجيل الخروج</UButton>
    </div>
  </UCard>
</template>
