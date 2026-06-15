import { useEffect, useRef } from "react"
import * as Location from "expo-location"
import { useMatchmaking } from "@/features/matchmaking/socket-context"

/**
 * Streams the user's live location to the server as a check-in for the stop
 * that's waiting to begin, and returns the group's presence quorum for it.
 *
 * The client only reports raw coordinates — the server owns the distance math
 * and decides who counts as "present" (so the 50m radius lives in one place and
 * can't be tampered with from the client). The returned value is whatever the
 * server last broadcast for this stop, or `undefined` before the first report.
 *
 * @param {Object} params
 * @param {{ id: string } | null} params.session
 * @param {{ id: string, latitude?: number|null, longitude?: number|null } | null} params.stop
 * @param {boolean} params.active  Whether the stop is awaiting start (not_started).
 * @returns {{ present: string[], total: number, allPresent: boolean } | undefined}
 */
export function useStopPresence({ session, stop, active }) {
  const { checkInStop, stopPresence } = useMatchmaking()

  // Hold the latest targets in a ref so the location watcher callback below
  // stays stable across stop changes instead of re-subscribing each time.
  const targetRef = useRef({ session, stop, active })
  targetRef.current = { session, stop, active }

  // Continuous watcher: re-reports on movement so wandering out of range drops
  // the member from the quorum on the server.
  useEffect(() => {
    let subscription
    let cancelled = false

    async function watch() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted" || cancelled) return
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (loc) => {
            const target = targetRef.current
            if (!target.active || !target.session || !target.stop) return
            if (target.stop.latitude == null || target.stop.longitude == null) return
            checkInStop(
              target.session.id,
              target.stop.id,
              loc.coords.latitude,
              loc.coords.longitude,
            )
          },
        )
        if (cancelled) {
          sub.remove()
          return
        }
        subscription = sub
      } catch {
        // Location unavailable — the stop simply stays gated until it recovers.
      }
    }

    watch()
    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [checkInStop])

  // One-shot check-in the moment a new stop becomes active, so a group already
  // standing at the venue registers without waiting for a movement update.
  useEffect(() => {
    if (!active || !session || !stop) return
    if (stop.latitude == null || stop.longitude == null) return
    let cancelled = false

    ;(async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync()
        if (status !== "granted" || cancelled) return
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        if (!cancelled) {
          checkInStop(session.id, stop.id, loc.coords.latitude, loc.coords.longitude)
        }
      } catch {
        // Ignore — the continuous watcher will catch up on the next fix.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [active, session?.id, stop?.id, stop?.latitude, stop?.longitude, checkInStop])

  return stop ? stopPresence[stop.id] : undefined
}
