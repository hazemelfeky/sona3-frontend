<route lang="yaml">
meta:
  requiresPerm:
    - families.view
    - aid.manage
</route>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '@/store'
import { useAidDetail, deleteAid, type AidDetailItem } from '@/features/aid/composables/useAidList'
import { formatNumber, formatDateDMY } from '@/utils/format'
import { toUserMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useStore()
const toast = useToast()

const aidId = computed(() => Number((route.params as Record<string, string>).aidId))
const isValidId = computed(() => Number.isInteger(aidId.value) && aidId.value > 0)

const { aid, items, volunteers, photos, notFound, loading, error, reload } = useAidDetail(aidId)

const canManage = computed(() => store.hasPerm('aid.manage'))

const money = (value: unknown) => `${formatNumber(value)} ج`

// مالي: "name - amount ج". عيني: "name ×qty" with the line's worth in
// brackets — or "تبرع عيني" where the lot has no unit_price, since a
// donated item is priceless here, not worth zero.
function itemLabel(item: AidDetailItem) {
  if (item.item_type === 'cash') return `${item.name ?? '—'} - ${money(item.amount)}`
  const head = `${item.name ?? '—'} ×${formatNumber(item.quantity)}`
  return item.unit_price === null ? `${head} (تبرع عيني)` : `${head} (${money(item.value)})`
}

const cashTotal = computed(() => Number(aid.value?.total_cash ?? 0))
const inventoryTotal = computed(() => Number(aid.value?.total_inventory_value ?? 0))
const grandTotal = computed(() => Number(aid.value?.total_value ?? 0))

function openEdit() {
  if (!aid.value) return
  router.push(
    `/families/${aid.value.family_id}/aid/${aid.value.aid_id}/edit?from=/aid/${aid.value.aid_id}`,
  )
}

/* ---- delete ---- */

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function onConfirmDelete() {
  if (!aid.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAid(aid.value.aid_id)
    deleteOpen.value = false
    toast.add({ title: 'تم حذف التنفيذ', color: 'success', icon: 'i-lucide-check-circle' })
    router.push('/aid')
  } catch (e) {
    deleteError.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <UButton
      to="/aid"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع للتنفيذات"
    />

    <div
      v-if="!isValidId"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">معرف التنفيذ غير صالح</p>
    </div>

    <template v-else-if="loading">
      <USkeleton class="h-6 w-48" />
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-32 w-full" />
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="error"
      icon="i-lucide-alert-circle"
      :actions="[
        { label: 'إعادة المحاولة', color: 'neutral', variant: 'outline', onClick: reload },
      ]"
    />

    <div
      v-else-if="notFound || !aid"
      class="flex flex-col items-center justify-center gap-2 py-24 text-center"
    >
      <UIcon name="i-lucide-file-question" class="text-dimmed size-10" />
      <p class="text-lg font-medium">لم يتم العثور على التنفيذ</p>
    </div>

    <template v-else>
      <UCard>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-2">
            <h1 class="text-2xl font-semibold">
              <ULink :to="`/families/${aid.family_id}`" class="hover:underline">
                {{ aid.family_head || '—' }}
              </ULink>
            </h1>
            <p v-if="aid.family_area" class="text-dimmed text-sm">{{ aid.family_area }}</p>
          </div>

          <div v-if="canManage" class="flex gap-2">
            <UButton
              icon="i-lucide-pencil"
              label="تعديل"
              size="sm"
              variant="soft"
              color="neutral"
              @click="openEdit"
            />
            <UButton
              icon="i-lucide-trash-2"
              label="مسح"
              size="sm"
              variant="soft"
              color="error"
              @click="deleteOpen = true"
            />
          </div>
        </div>

        <dl class="grid gap-3 sm:grid-cols-3 text-sm pt-4">
          <div>
            <dt class="text-dimmed">التاريخ</dt>
            <dd>{{ formatDateDMY(aid.aid_date) }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">عدد المساعدات</dt>
            <dd>{{ formatNumber(aid.items_count) }}</dd>
          </div>
          <div>
            <dt class="text-dimmed">الإجمالي</dt>
            <dd class="font-medium">{{ grandTotal === 0 ? '—' : money(grandTotal) }}</dd>
          </div>
        </dl>

        <div v-if="aid.note" class="pt-4">
          <p class="text-dimmed text-sm">ملاحظة</p>
          <p class="bg-elevated rounded-md p-3 text-sm whitespace-pre-wrap">{{ aid.note }}</p>
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-medium">المتطوعون</h3></template>
        <p v-if="!volunteers.length" class="text-dimmed text-sm text-center py-6">
          مفيش متطوعين مسجلين
        </p>
        <div v-else class="flex flex-wrap gap-1.5 p-2">
          <UBadge v-for="(name, index) in volunteers" :key="index" color="neutral" variant="subtle">
            {{ name }}
          </UBadge>
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-medium">المساعدات</h3></template>
        <p v-if="!items.length" class="text-dimmed text-sm text-center py-6">مفيش مساعدات مسجلة</p>
        <template v-else>
          <div class="flex flex-wrap gap-1.5 p-2">
            <UBadge
              v-for="item in items"
              :key="item.item_id"
              :color="item.item_type === 'cash' ? 'success' : 'primary'"
              variant="subtle"
            >
              {{ itemLabel(item) }}
            </UBadge>
          </div>

          <dl class="border-default mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-sm">
            <div>
              <dt class="text-dimmed">نقدي</dt>
              <dd>{{ money(cashTotal) }}</dd>
            </div>
            <div>
              <dt class="text-dimmed">قيمة عينية</dt>
              <dd>{{ money(inventoryTotal) }}</dd>
            </div>
            <div>
              <dt class="text-dimmed">الإجمالي</dt>
              <dd class="font-semibold">{{ money(grandTotal) }}</dd>
            </div>
          </dl>
        </template>
      </UCard>

      <UCard v-if="photos.length">
        <template #header><h3 class="font-medium">صور التنفيذ</h3></template>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2">
          <a
            v-for="photo in photos"
            :key="photo.attachment_id"
            :href="photo.url ?? undefined"
            target="_blank"
            rel="noopener"
            class="block"
          >
            <img
              v-if="photo.url"
              :src="photo.url"
              :alt="photo.caption ?? 'صورة التنفيذ'"
              loading="lazy"
              class="w-full aspect-square rounded-md object-cover bg-elevated ring-1 ring-default"
            />
            <div
              v-else
              class="w-full aspect-square rounded-md bg-elevated ring-1 ring-default flex items-center justify-center"
            >
              <UIcon name="i-lucide-image-off" class="text-dimmed size-6" />
            </div>
          </a>
        </div>
      </UCard>
    </template>

    <UModal v-model:open="deleteOpen" title="حذف التنفيذ؟ هيرجع المخزون المستهلك.">
      <template #body>
        <p class="text-sm">
          هتمسح التنفيذ نهائيًا، ومعاه المساعدات والمتطوعين والصور المرتبطة بيه. وده إجراء لا رجعة
          فيه.
        </p>

        <UAlert
          v-if="deleteError"
          color="error"
          variant="subtle"
          :title="deleteError"
          icon="i-lucide-alert-circle"
          class="mt-4"
        />
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="إلغاء"
            variant="ghost"
            color="neutral"
            :disabled="deleting"
            @click="deleteOpen = false"
          />
          <UButton label="مسح نهائيًا" color="error" :loading="deleting" @click="onConfirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
