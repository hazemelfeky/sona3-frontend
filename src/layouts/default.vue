<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useDark } from '@vueuse/core'
import { nav } from '@/config/dashboards'

const open = ref(false)

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
  return nav.map((entry) => ({
    label: entry.label,
    icon: entry.icon,
    to: entry.slug ? `/dashboards/${entry.slug}` : undefined,
    disabled: entry.disabled,
  })) satisfies NavigationMenuItem[]
}

const user = ref({
  name: 'Benjamin Canac',
  avatar: {
    src: 'https://github.com/benjamincanac.png',
    alt: 'Benjamin Canac',
  },
})

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
    },
    {
      label: 'Billing',
      icon: 'i-lucide-credit-card',
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings',
    },
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
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
    },
  ],
  [
    {
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      to: 'https://github.com/nuxt/ui',
      target: '_blank',
    },
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
    },
  ],
])

defineShortcuts(extractShortcuts(teamsItems.value))
</script>

<template>
  <div class="flex flex-1">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      side="right"
      rail
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
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            v-bind="user"
            :label="user?.name"
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

    <div class="flex-1 flex flex-col">
      <div class="lg:hidden h-(--ui-header-height) shrink-0 flex items-center px-4 border-b border-default">
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

      <div class="flex-1 p-4">
        <router-view />
      </div>
    </div>
  </div>
</template>
