import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { db } from '@/lib/supabase'

export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/

export type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

// USERNAME_PATTERN answers "is it valid" but not "what's wrong with it" — a
// user staring at "الشكل غلط" can't tell which of the five rules they broke.
// Return every rule the candidate fails so the form can list them all.
export function describeUsernameErrors(value: string): string[] {
  const name = value.trim()
  if (!name || USERNAME_PATTERN.test(name)) return []

  const reasons: string[] = []

  if (/[A-Z]/.test(name)) reasons.push(`الحروف الكبيرة مش مسموحة — اكتبه كده: ${name.toLowerCase()}`)

  if (/\s/.test(name)) reasons.push('مافيش مسافات — استخدم "_" أو "." بدلها')

  const badChars = Array.from(new Set(name.split('').filter((c) => !/[A-Za-z0-9._\s]/.test(c))))
  if (badChars.length > 0) {
    reasons.push(
      `مسموح بس حروف إنجليزية صغيرة (a–z) وأرقام و "." و "_" — شيل: ${badChars.join(' ')}`,
    )
  }

  if (!/^[A-Za-z]/.test(name)) reasons.push('لازم يبدأ بحرف إنجليزي، مش رقم أو رمز')

  if (name.length < 3) reasons.push(`قصير — لازم 3 حروف على الأقل (دلوقتي ${name.length})`)
  else if (name.length > 20) reasons.push(`طويل — أقصى حاجة 20 حرف (دلوقتي ${name.length})`)

  return reasons
}

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
