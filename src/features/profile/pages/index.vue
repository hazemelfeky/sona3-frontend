<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'

const router = useRouter()
const store = useStore()

onMounted(() => {
  if (store.userId) router.replace(`/profile/${store.userId}`)
})
</script>

<template>
  <div class="flex justify-center py-24">
    <USkeleton class="h-8 w-48" />
  </div>
</template>
