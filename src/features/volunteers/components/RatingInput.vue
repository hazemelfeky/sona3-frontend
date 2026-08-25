<script setup lang="ts">
defineProps<{ label: string }>()
const value = defineModel<number>({ required: true })
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <span class="text-sm">{{ label }}</span>
    <div class="flex gap-1">
      <UButton
        v-for="n in 5"
        :key="n"
        :label="String(n)"
        size="xs"
        :variant="value === n ? 'solid' : 'soft'"
        :color="value === n ? 'primary' : 'neutral'"
        @click="value = n"
      />
    </div>
  </div>
</template>
