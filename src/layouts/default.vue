<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useDark, useMediaQuery } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { nav } from '@/config/nav'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const store = useStore()

async function logout() {
  await store.signOut()
  router.push('/auth/login')
}

const userAvatarUrl = ref<string | null>(null)

// Signed URL, not cached — expires in 1h, regenerated whenever the avatar
// path changes (including on login/refresh via store.profile).
watch(
  () => store.profile?.avatar_path,
  async (path) => {
    userAvatarUrl.value = null
    if (!path) return
    const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
    userAvatarUrl.value = data?.signedUrl ?? null
  },
  { immediate: true },
)
// vite-plugin-vue-layouts-next always wraps the route tree in this layout
// (inheritDefaultLayout), so a per-page custom layout would nest *inside*
// this one instead of replacing it. Bare pages (auth) opt out of the shell
// via this flag instead of a second layout.
const isBare = computed(() => Boolean(route.meta.bare))

const open = ref(false)

// Matches USidebar's own mobile breakpoint (see Sidebar.vue) — only the
// mobile slideover should auto-close on select; on desktop `open` also
// drives the collapsible sidebar, so closing it there would collapse it.
const isMobile = useMediaQuery('(max-width: 1023px)')
function closeMobileDrawer() {
  if (isMobile.value) open.value = false
}
watch(() => route.fullPath, closeMobileDrawer)

const isDark = useDark()

const teams = ref([
  {
    label: 'Sona3',
    avatar: {
      src: '/logo.svg',
      alt: 'Sona3',
    },
  },
  {
    label: 'Vue',
    avatar: {
      src: 'https://github.com/vuejs.png',
      alt: 'Vue',
    },
  },
  {
    label: 'UnJS',
    avatar: {
      src: 'https://github.com/unjs.png',
      alt: 'UnJS',
    },
  },
])
const selectedTeam = ref(teams.value[0])

const teamsItems = computed<DropdownMenuItem[][]>(() => {
  return [
    teams.value.map((team, index) => ({
      ...team,
      kbds: ['meta', String(index + 1)],
      onSelect() {
        selectedTeam.value = team
      },
    })),
    [
      {
        label: 'Create team',
        icon: 'i-lucide-circle-plus',
      },
    ],
  ]
})

function getItems(_state: 'collapsed' | 'expanded') {
  return nav
    .filter((entry) => !entry.requiresPerm || store.hasPerm(entry.requiresPerm))
    .map((entry) => ({
      label: entry.label,
      icon: entry.icon,
      to: entry.to,
      disabled: entry.disabled,
    })) satisfies NavigationMenuItem[]
}

const userName = computed(() => store.profile?.full_name || store.profile?.username || '')
const userAvatar = computed(() => ({
  src: userAvatarUrl.value ?? undefined,
  alt: userName.value,
}))

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: store.userId ? `/profile/${store.userId}` : undefined,
    },
    // {
    //   label: 'Billing',
    //   icon: 'i-lucide-credit-card',
    // },
    // {
    //   label: 'Settings',
    //   icon: 'i-lucide-settings',
    //   to: '/settings',
    // },
  ],
  [
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: !isDark.value,
          onUpdateChecked(checked: boolean) {
            if (checked) {
              isDark.value = false
            }
            closeMobileDrawer()
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: isDark.value,
          onUpdateChecked(checked: boolean) {
            if (checked) {
              isDark.value = true
            }
            closeMobileDrawer()
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
    },
  ],
  [
    // {
    //   label: 'GitHub',
    //   icon: 'i-simple-icons-github',
    //   to: 'https://github.com/nuxt/ui',
    //   target: '_blank',
    // },
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
      onSelect: logout,
    },
  ],
])

defineShortcuts(extractShortcuts(teamsItems.value))
</script>

<template>
  <div v-if="isBare" class="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <div class="w-full max-w-md">
      <router-view />
    </div>
  </div>

  <div v-else class="flex flex-1">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      side="right"
      class="print:hidden"
      :ui="{
        container: 'h-full',
        inner: 'bg-elevated/25 divide-transparent',
        body: 'py-0',
      }"
    >
      <template #header>
        <UButton
          label="Sona3"
          variant="ghost"
          class="w-full justify-start overflow-hidden rounded-md bg-transparent shadow-none hover:bg-transparent"
          :ui="{
            trailingIcon: 'text-dimmed ms-auto',
          }"
          @click="open = !open"
        >
          <template #leading>
            <img
              src="/logo.svg"
              alt="Sona3"
              class="shrink-0 object-contain dark:brightness-0 dark:invert"
              style="width: 1.3rem; height: 1.3rem; min-width: 1.3rem; min-height: 1.3rem;"
            />
          </template>
        </UButton>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="getItems(state)"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden max-lg:min-h-11' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            :avatar="userAvatar"
            :label="userName"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            square
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{
              trailingIcon: 'text-dimmed ms-auto',
            }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="min-w-0 flex-1 flex flex-col">
      <div class="lg:hidden h-(--ui-header-height) shrink-0 flex items-center px-4 border-b border-default print:hidden">
        <UButton
          label="Sona3"
          variant="ghost"
          class="justify-start overflow-hidden rounded-md bg-transparent shadow-none hover:bg-transparent"
          @click="open = !open"
        >
          <template #leading>
            <img
              src="/logo.svg"
              alt="Sona3"
              class="shrink-0 object-contain dark:brightness-0 dark:invert"
              style="width: 1.3rem; height: 1.3rem; min-width: 1.3rem; min-height: 1.3rem;"
            />
          </template>
        </UButton>
      </div>

      <div class="flex-1 p-4 print:p-0">
        <router-view />
      </div>
    </div>
  </div>
</template>
