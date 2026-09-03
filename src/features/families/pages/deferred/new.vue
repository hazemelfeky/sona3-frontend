<route lang="yaml">
meta:
  requiresPerm: families.create
</route>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import {
  emptyDeferredForm,
  createDeferredFamily,
} from '@/features/families/composables/useDeferredFamilies'

const router = useRouter()
const store = useStore()
const toast = useToast()

const form = ref(emptyDeferredForm())
const saving = ref(false)
const errorMessage = ref('')

const canSave = computed(() => form.value.head_name.trim().length > 0 && !saving.value)

async function onSubmit() {
  if (!canSave.value || !store.userId) return
  saving.value = true
  errorMessage.value = ''
  try {
    await createDeferredFamily(form.value, store.userId)
    toast.add({ title: 'تم حفظ الأسرة المؤجلة', color: 'success', icon: 'i-lucide-check-circle' })
    router.push('/families')
  } catch (e) {
    // Hiding the entry points for users without families.create is UX only
    // — RLS is the real gate, so a rejected insert still surfaces here
    // rather than failing silently.
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-semibold">إضافة أسرة مؤجلة</h1>

    <!-- Quiet counterpart to the hint on the full form — the two pages point
         at each other so a wrong turn costs one click, not a nav hunt. -->
    <RouterLink
      to="/families/new"
      class="inline-block text-sm text-dimmed hover:text-default hover:underline"
    >
      → رجوع لإضافة أسرة كاملة
    </RouterLink>

    <UCard>
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="تسجيل سريع"
        description="سجّل البيانات الأساسية بس، والبحث الكامل يتعمل بعد كده."
        class="mb-4"
      />

      <form class="space-y-4 p-2" @submit.prevent="onSubmit">
        <UFormField label="الاسم" required>
          <UInput v-model="form.head_name" icon="i-lucide-user" class="w-full" />
        </UFormField>

        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="المنطقة">
            <UInput v-model="form.area" icon="i-lucide-map-pin" class="w-full" />
          </UFormField>

          <UFormField label="رقم الموبايل">
            <UInput v-model="form.head_phone" icon="i-lucide-phone" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="العنوان التفصيلي">
          <UInput v-model="form.address" icon="i-lucide-home" class="w-full" />
        </UFormField>

        <UFormField label="الاحتياج">
          <UTextarea v-model="form.needs_raw" :rows="3" autoresize class="w-full" />
        </UFormField>

        <UFormField label="تفاصيل أخرى">
          <UTextarea v-model="form.general_notes" :rows="3" autoresize class="w-full" />
        </UFormField>

        <UCheckbox v-model="form.is_widow" label="أرملة" />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
          icon="i-lucide-alert-circle"
        />

        <div class="flex justify-end">
          <UButton type="submit" label="حفظ" :loading="saving" :disabled="!canSave" />
        </div>
      </form>
    </UCard>
  </div>
</template>
