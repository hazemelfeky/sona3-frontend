<script setup lang="ts">
import { registerSW } from 'virtual:pwa-register'

// registerType is 'autoUpdate', so a new build activates and reloads on its
// own — this only surfaces that it's happening, rather than having the page
// blink for no visible reason.
const toast = useToast()

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    registration?.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        // An existing controller means this is an update to a running app,
        // not the very first install.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          toast.add({
            title: 'فيه تحديث جديد، جاري التحديث...',
            color: 'info',
            icon: 'i-lucide-refresh-cw',
          })
        }
      })
    })
  },
})
</script>

<template><span class="hidden" /></template>
