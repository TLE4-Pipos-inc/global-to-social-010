import { useCallback, useState } from "react"

/**
 * Runs an async action while tracking a `busy` flag. Errors are swallowed here
 * because the SocketProvider surfaces them globally via `lastError` → Alert.
 *
 * @returns {[boolean, (fn: () => Promise<unknown>) => Promise<void>]}
 */
export function useBusyAction() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      // already surfaced by the provider
    } finally {
      setBusy(false)
    }
  }, [])
  return [busy, run]
}
