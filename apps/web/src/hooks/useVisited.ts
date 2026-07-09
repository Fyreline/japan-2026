import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLES } from '../lib/supabase'
import type { AuthState } from '../auth/useAuth'

const LOCAL_KEY = 'japan2026VisitedMarks'

function readLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function writeLocal(keys: Set<string>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...keys]))
  } catch {
    /* storage full / private mode — in-memory state still holds */
  }
}

export interface UseVisited {
  isVisited(key: string): boolean
  toggle(key: string): void
}

/** The lightest sync loop in the app (ARCHITECTURE.md §16, DATA_MODEL.md
 * §10) — a shared, presence-only Set<item_key>. Provided once in App.tsx
 * (like useSubmittedSpots) and passed down so a tick on one surface is
 * instantly visible on every other surface showing the same item. */
export function useVisited(auth: AuthState): UseVisited {
  const [keys, setKeys] = useState<Set<string>>(() => new Set(readLocal()))
  const keysRef = useRef(keys)
  keysRef.current = keys

  // ── initial load + realtime (signed-in only) ──────────────────────────
  useEffect(() => {
    if (auth.status !== 'signedIn' || !supabase) return
    const client = supabase
    let cancelled = false

    client
      .from(TABLES.visited)
      .select('item_key')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const next = new Set(keysRef.current)
        for (const row of data as { item_key: string }[]) next.add(row.item_key)
        setKeys(next)
        writeLocal(next)
      })

    const channel: RealtimeChannel = client
      .channel('visited-marks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.visited },
        (payload) => {
          setKeys((prev) => {
            const next = new Set(prev)
            if (payload.eventType === 'DELETE') {
              const old = payload.old as { item_key?: string }
              if (old.item_key) next.delete(old.item_key)
            } else {
              const row = payload.new as { item_key: string }
              next.add(row.item_key)
            }
            writeLocal(next)
            return next
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      client.removeChannel(channel)
    }
  }, [auth.status])

  const toggle = useCallback(
    (key: string) => {
      const wasVisited = keysRef.current.has(key)
      const next = new Set(keysRef.current)
      if (wasVisited) next.delete(key)
      else next.add(key)
      setKeys(next)
      writeLocal(next)

      if (auth.status !== 'signedIn' || !supabase) return
      const client = supabase
      if (wasVisited) {
        client.from(TABLES.visited).delete().eq('item_key', key)
      } else {
        client
          .from(TABLES.visited)
          .upsert({ item_key: key }, { onConflict: 'item_key', ignoreDuplicates: true })
      }
      // Failures here are quiet by design (DATA_MODEL.md §10d) — the
      // optimistic local flip + localStorage snapshot already stand; a
      // presence-only toggle has no per-item sync whisper surface to fail
      // into, unlike the itinerary/packing/journal rows.
    },
    [auth.status],
  )

  const isVisited = useCallback((key: string) => keys.has(key), [keys])

  return useMemo(() => ({ isVisited, toggle }), [isVisited, toggle])
}
