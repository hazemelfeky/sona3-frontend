<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  fetchFamilyGroups,
  loadFamilyGroupFamilyIds,
  renameFamilyGroup,
  deleteFamilyGroup,
  type FamilyGroupSummary,
  type LoadedFamilyIds,
} from '@/features/families/composables/useFamilyGroups'
import { formatDateDMY } from '@/utils/format'

const emit = defineEmits<{ loaded: [LoadedFamilyIds] }>()
const open = defineModel<boolean>('open', { required: true })

const groups = ref<FamilyGroupSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const loadingGroupId = ref<string | null>(null)

const renameTarget = ref<FamilyGroupSummary | null>(null)
const renameValue = ref('')
const renaming = ref(false)

const deleteTarget = ref<FamilyGroupSummary | null>(null)
const deleting = ref(false)

watch(open, (value) => {
  if (value) refresh()
})

async function refresh() {
  loading.value = true
  errorMessage.value = ''
  try {
    groups.value = await fetchFamilyGroups()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    loading.value = false
  }
}

async function pickGroup(group: FamilyGroupSummary) {
  loadingGroupId.value = group.groupId
  errorMessage.value = ''
  try {
    const result = await loadFamilyGroupFamilyIds(group.groupId)
    open.value = false
    emit('loaded', result)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    loadingGroupId.value = null
  }
}

function openRename(group: FamilyGroupSummary) {
  renameTarget.value = group
  renameValue.value = group.name
}

async function confirmRename() {
  if (!renameTarget.value || !renameValue.value.trim()) return
  renaming.value = true
  try {
    await renameFamilyGroup(renameTarget.value.groupId, renameValue.value.trim())
    renameTarget.value = null
    await refresh()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    renaming.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteFamilyGroup(deleteTarget.value.groupId)
    deleteTarget.value = null
    await refresh()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'حصلت مشكلة. حاول تاني'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="تحميل مجموعة" class="z-50">
    <template #body>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
        class="mb-3"
      />

      <template v-if="loading">
        <USkeleton v-for="i in 3" :key="i" class="mb-2 h-14 w-full" />
      </template>

      <p v-else-if="groups.length === 0" class="text-dimmed text-sm">مفيش مجموعات محفوظة لسه</p>

      <div v-else class="max-h-96 space-y-2 overflow-y-auto">
        <div
          v-for="group in groups"
          :key="group.groupId"
          class="border-default flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <button
            type="button"
            class="flex-1 text-right disabled:opacity-50"
            :disabled="loadingGroupId !== null"
            @click="pickGroup(group)"
          >
            <p class="font-medium">{{ group.name }}</p>
            <p class="text-dimmed text-xs">
              {{ group.familyCount }} أسرة · {{ group.createdBy }} · {{ formatDateDMY(group.createdAt) }}
            </p>
          </button>
          <div class="flex shrink-0 items-center gap-1">
            <UIcon v-if="loadingGroupId === group.groupId" name="i-lucide-loader-2" class="size-4 animate-spin" />
            <template v-else>
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="sm"
                square
                aria-label="إعادة تسمية"
                @click="openRename(group)"
              />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="sm"
                square
                aria-label="مسح"
                @click="deleteTarget = group"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton label="إغلاق" variant="ghost" color="neutral" @click="open = false" />
    </template>
  </UModal>

  <UModal
    :open="renameTarget !== null"
    title="إعادة تسمية المجموعة"
    class="z-50"
    @update:open="(v: boolean) => { if (!v) renameTarget = null }"
  >
    <template #body>
      <UInput v-model="renameValue" placeholder="اسم المجموعة" autofocus @keyup.enter="confirmRename" />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" :disabled="renaming" @click="renameTarget = null" />
        <UButton label="حفظ" :loading="renaming" :disabled="!renameValue.trim()" @click="confirmRename" />
      </div>
    </template>
  </UModal>

  <UModal
    :open="deleteTarget !== null"
    title="مسح المجموعة"
    class="z-50"
    @update:open="(v: boolean) => { if (!v) deleteTarget = null }"
  >
    <template #body>
      <p class="text-sm">
        هتمسح مجموعة <span class="font-semibold">{{ deleteTarget?.name }}</span> نهائيًا، وده إجراء لا رجعة فيه.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="إلغاء" variant="ghost" color="neutral" :disabled="deleting" @click="deleteTarget = null" />
        <UButton label="مسح نهائيًا" color="error" :loading="deleting" @click="confirmDelete" />
      </div>
    </template>
  </UModal>
</template>
