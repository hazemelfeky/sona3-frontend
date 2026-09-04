<route lang="yaml">
meta:
  requiresPerm: aid.manage
</route>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { db } from '@/lib/supabase'
import { useStore } from '@/store'
import { useStockLot } from '@/features/stock/composables/useStock'
import VolunteerMultiSelect from '@/features/aid/components/VolunteerMultiSelect.vue'
import { createAid } from '@/features/aid/composables/useAid'
import { formatNumber } from '@/utils/format'
import { toUserMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const store = useStore()
const toast = useToast()

const lotId = computed(() => Number((route.params as Record<string, string>).lotId))
const { lot, loading: lotLoading, error: lotError } = useStockLot(lotId)

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const aidDate = ref(today())
const volunteerIds = ref<string[]>([])

/* ---- family picker: same view, search field and active-only scope the
       families list itself uses ---- */

interface FamilyHit {
  family_id: number
  head_name: string | null
  area: string | null
}

const search = ref('')
const areaFilter = ref<string | null>(null)
const debouncedSearch = refDebounced(search, 300)
const results = ref<FamilyHit[]>([])
const searching = ref(false)
const searchError = ref<string | null>(null)
const areaOptions = ref<{ label: string; value: string }[]>([])

async function loadAreas() {
  const { data } = await db.from('v_families_list').select('area').eq('record_status', 'active')
  const rows = (data ?? []) as { area: string | null }[]
  const unique = [...new Set(rows.map((r) => r.area).filter((a): a is string => Boolean(a)))]
  areaOptions.value = unique
    .sort((a, b) => a.localeCompare(b, 'ar'))
    .map((a) => ({ label: a, value: a }))
}
void loadAreas()

async function runSearch() {
  searching.value = true
  searchError.value = null
  try {
    let query = db
      .from('v_families_list')
      .select('family_id, head_name, area')
      .eq('record_status', 'active')
      .order('head_name')
      .limit(25)
    if (debouncedSearch.value) query = query.ilike('search_text', `%${debouncedSearch.value}%`)
    if (areaFilter.value) query = query.eq('area', areaFilter.value)

    const { data, error } = await query
    if (error) throw error
    results.value = (data ?? []) as FamilyHit[]
  } catch (e) {
    searchError.value = toUserMessage(e, 'حصلت مشكلة أثناء البحث')
    results.value = []
  } finally {
    searching.value = false
  }
}
watch([debouncedSearch, areaFilter], runSearch, { immediate: true })

/* ---- picked families ---- */

interface PickedFamily extends FamilyHit {
  quantity: number
}

const picked = ref<PickedFamily[]>([])
const pickedIds = computed(() => new Set(picked.value.map((p) => p.family_id)))

function addFamily(hit: FamilyHit) {
  if (pickedIds.value.has(hit.family_id)) return
  picked.value.push({ ...hit, quantity: 1 })
}
function removeFamily(familyId: number) {
  picked.value = picked.value.filter((p) => p.family_id !== familyId)
}
function bump(row: PickedFamily, delta: number) {
  row.quantity = Math.max(1, row.quantity + delta)
}

const distributed = computed(() => picked.value.reduce((sum, p) => sum + p.quantity, 0))
const quantityLeft = computed(() => lot.value?.quantity_left ?? 0)
const remaining = computed(() => quantityLeft.value - distributed.value)
const overdrawn = computed(() => distributed.value > quantityLeft.value)

/* ---- submit ---- */

const saving = ref(false)
const progress = ref<{ done: number; total: number } | null>(null)
const errorMessage = ref('')

const canSubmit = computed(
  () =>
    picked.value.length > 0 && volunteerIds.value.length > 0 && !overdrawn.value && !saving.value,
)

async function onSubmit() {
  if (!canSubmit.value || !store.userId) return
  saving.value = true
  errorMessage.value = ''
  progress.value = { done: 0, total: picked.value.length }
  try {
    // No bulk table exists — one aid per family, each with a single
    // inventory item, and the same volunteers attached to every one.
    for (const [index, row] of picked.value.entries()) {
      await createAid({
        familyId: row.family_id,
        aidDate: aidDate.value,
        note: null,
        items: [{ kind: 'inventory', lot_id: lotId.value, quantity: String(row.quantity) }],
        volunteerIds: volunteerIds.value,
        createdBy: store.userId,
      })
      progress.value = { done: index + 1, total: picked.value.length }
    }

    toast.add({
      title: `تم التوزيع على ${picked.value.length} أسرة`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    router.push(`/stock/${lotId.value}`)
  } catch (e) {
    // Whatever already committed stays committed; the message says where it
    // stopped so the rest can be redone without guessing.
    const done = progress.value?.done ?? 0
    const suffix = done ? ` (اتسجل ${done} أسرة قبل الخطأ)` : ''
    errorMessage.value = toUserMessage(e, 'حصلت مشكلة. حاول تاني') + suffix
  } finally {
    saving.value = false
    progress.value = null
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <UButton
      :to="`/stock/${lotId}`"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-right"
      label="رجوع للمنتج"
    />

    <USkeleton v-if="lotLoading" class="h-24 w-full" />

    <UAlert
      v-else-if="lotError"
      color="error"
      variant="subtle"
      :title="lotError"
      icon="i-lucide-alert-circle"
    />

    <template v-else-if="lot">
      <h1 class="text-2xl font-semibold">توزيع {{ lot.name || 'المنتج' }} لأسر</h1>

      <!-- Live counter, sticky so it stays visible while picking families. -->
      <UCard class="sticky top-2 z-10">
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-dimmed text-xs">الموزّع</p>
            <p class="text-xl font-semibold">{{ formatNumber(distributed) }}</p>
          </div>
          <div>
            <p class="text-dimmed text-xs">المتبقي بالمخزن</p>
            <p class="text-xl font-semibold">{{ formatNumber(quantityLeft) }}</p>
          </div>
          <div>
            <p class="text-dimmed text-xs">فاضل</p>
            <p
              class="text-xl font-semibold"
              :class="overdrawn ? 'text-red-600 dark:text-red-400' : ''"
            >
              {{ formatNumber(remaining) }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="overdrawn"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="تخطيت الكمية المتاحة"
          class="mt-3"
        />
      </UCard>

      <UCard>
        <div class="grid sm:grid-cols-2 gap-4 p-2">
          <UFormField label="التاريخ" required>
            <UInput v-model="aidDate" type="date" icon="i-lucide-calendar" class="w-full" />
          </UFormField>
          <div class="sm:col-span-2">
            <VolunteerMultiSelect v-model="volunteerIds" />
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-medium">اختر الأسر</h3></template>

        <div class="flex flex-wrap items-center gap-3 p-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="بحث بالاسم أو الرقم..."
            class="w-full sm:w-64"
          />
          <USelectMenu
            v-model="areaFilter"
            :items="areaOptions"
            value-key="value"
            label-key="label"
            placeholder="المنطقة"
            class="w-40"
          />
        </div>

        <UAlert
          v-if="searchError"
          color="error"
          variant="subtle"
          :title="searchError"
          icon="i-lucide-alert-circle"
        />

        <div v-else class="max-h-64 overflow-y-auto divide-y divide-default">
          <p v-if="searching" class="text-dimmed text-sm text-center py-4">جاري البحث...</p>
          <p v-else-if="!results.length" class="text-dimmed text-sm text-center py-4">
            لا توجد نتائج
          </p>
          <button
            v-for="hit in results"
            v-else
            :key="hit.family_id"
            type="button"
            class="flex w-full items-center justify-between gap-3 px-2 py-2 text-start hover:bg-elevated/50 disabled:opacity-50"
            :disabled="pickedIds.has(hit.family_id)"
            @click="addFamily(hit)"
          >
            <span class="min-w-0 truncate">{{ hit.head_name || '—' }}</span>
            <span class="text-dimmed text-xs shrink-0">{{ hit.area || '—' }}</span>
            <UIcon
              :name="pickedIds.has(hit.family_id) ? 'i-lucide-check' : 'i-lucide-plus'"
              class="size-4 shrink-0"
            />
          </button>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-medium">الأسر المختارة ({{ picked.length }})</h3>
        </template>

        <p v-if="!picked.length" class="text-dimmed text-sm text-center py-8">
          لسه مختارتش أي أسرة
        </p>

        <ul v-else class="divide-y divide-default">
          <li v-for="row in picked" :key="row.family_id" class="flex items-center gap-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate">{{ row.head_name || '—' }}</p>
              <p class="text-xs text-dimmed">{{ row.area || '—' }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                icon="i-lucide-minus"
                size="xs"
                color="neutral"
                variant="soft"
                aria-label="أقل"
                @click="bump(row, -1)"
              />
              <span class="w-8 text-center font-medium">{{ row.quantity }}</span>
              <UButton
                icon="i-lucide-plus"
                size="xs"
                color="neutral"
                variant="soft"
                aria-label="أكتر"
                @click="bump(row, 1)"
              />
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="error"
                variant="ghost"
                aria-label="شيل"
                @click="removeFamily(row.family_id)"
              />
            </div>
          </li>
        </ul>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />

      <div class="flex items-center justify-end gap-3">
        <span v-if="progress" class="text-sm text-dimmed">
          جارٍ التوزيع... {{ progress.done }}/{{ progress.total }}
        </span>
        <UButton
          size="lg"
          label="تنفيذ التوزيع"
          :loading="saving"
          :disabled="!canSubmit"
          @click="onSubmit"
        />
      </div>
    </template>
  </div>
</template>
