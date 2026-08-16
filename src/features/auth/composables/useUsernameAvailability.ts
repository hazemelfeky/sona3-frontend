import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { db } from '@/lib/supabase'

export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/

export type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

export function useUsernameAvailability() {
  const status = ref<UsernameStatus>('idle')

  const checkRemote = useDebounceFn(async (candidate: string) => {
    // rpc() fights the typed client's literal-key generics here (same
    // reason lib/supabase.ts keeps the untyped `db` alias).
    const { data, error } = (await db.rpc('is_username_available', { candidate })) as {
      data: boolean | null
      error: { message: string } | null
    }
    status.value = error ? 'invalid' : data ? 'available' : 'taken'
  }, 400)

  function onInput(value: string) {
    if (!value) {
      status.value = 'idle'
      return
    }
    if (!USERNAME_PATTERN.test(value)) {
      status.value = 'invalid'
      return
    }
    status.value = 'checking'
    checkRemote(value)
  }

  return { status, onInput }
}
