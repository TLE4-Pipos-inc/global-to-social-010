let accessToken = null

/** @type {Set<(token: string | null) => void>} */
const listeners = new Set()

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
  for (const listener of listeners) listener(token)
}

/**
 * Subscribe to access-token changes (login / refresh / logout).
 * Returns an unsubscribe function.
 *
 * @param {(token: string | null) => void} listener
 * @returns {() => void}
 */
export function subscribeAccessToken(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
