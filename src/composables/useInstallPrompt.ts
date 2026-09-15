interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Module scope on purpose: `beforeinstallprompt` can fire before any component
// mounts, so the listener is attached as soon as this module is imported.
const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)
const standalone = ref(false)

const isBrowser = typeof window !== 'undefined'

function detectStandalone() {
  if (!isBrowser) return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iPadOS reports itself as "MacIntel", hence the touch-point check.
const isIos =
  isBrowser &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

if (isBrowser) {
  standalone.value = detectStandalone()

  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
    standalone.value = detectStandalone()
  })

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferredPrompt.value = null
  })
}

export function useInstallPrompt() {
  const dismissed = ref(false)

  const canPrompt = computed(() => !!deferredPrompt.value)
  // iOS has no beforeinstallprompt — show manual "Add to Home Screen" steps.
  const showIosInstructions = computed(() => isIos && !standalone.value)

  const visible = computed(
    () =>
      !dismissed.value &&
      !installed.value &&
      !standalone.value &&
      (canPrompt.value || showIosInstructions.value),
  )

  async function install() {
    const promptEvent = deferredPrompt.value
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    // A prompt event can only be used once, whatever the outcome.
    deferredPrompt.value = null
    dismissed.value = true
  }

  function dismiss() {
    dismissed.value = true
  }

  return { visible, canPrompt, showIosInstructions, install, dismiss }
}
