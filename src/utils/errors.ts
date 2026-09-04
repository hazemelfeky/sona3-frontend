// The app shell is cached by the service worker, so it opens fine with no
// network — but every row of data still comes off the wire. When that fails
// the raw error is a bare "Failed to fetch" / "NetworkError", which reads
// like a bug rather than "you're offline". Everything user-facing goes
// through here so the offline case says so, in Arabic.
export const OFFLINE_MESSAGE = 'لا يوجد اتصال بالإنترنت. حاول تاني.'

const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|fetch failed/i

export function isOfflineError(error: unknown): boolean {
  // navigator.onLine only proves the *absence* of a link — being "online"
  // says nothing about whether the request actually made it — so the
  // message check carries the other half.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  return NETWORK_ERROR_PATTERN.test(raw)
}

// Replaces the `e instanceof Error ? e.message : '...'` shape used across
// the app: same per-call-site fallback, plus the offline case handled once.
export function toUserMessage(error: unknown, fallback: string): string {
  if (isOfflineError(error)) return OFFLINE_MESSAGE
  return error instanceof Error ? error.message : fallback
}
