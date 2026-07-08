import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLES } from '../lib/supabase'
import type { AuthState } from '../auth/useAuth'
import { ITINERARY_SEED } from '../data/itinerarySeed'
import { SLOT_TYPES, type ItinerarySlot, type SlotType } from '../data/types'

const LOCAL_KEY = 'japan2026ItinerarySlots'
const RENUMBER_EPSILON = 1e-6

export type SyncStatus = 'synced' | 'saving' | 'error' | 'local-only'

// ── row <-> client mapping (DATA_MODEL.md §6e) ────────────────────────────
interface SlotRow {
  id?: number
  slot_key: string
  day: number
  position: number
  time_label?: string | null
  slot_type?: string | null
  content?: string | null
}

function rowToSlot(row: SlotRow): ItinerarySlot {
  const type = (SLOT_TYPES as string[]).includes(row.slot_type ?? '')
    ? (row.slot_type as SlotType)
    : 'default'
  return {
    slotKey: row.slot_key,
    day: row.day,
    position: Number(row.position),
    time: row.time_label ?? '',
    type,
    text: row.content ?? '',
  }
}

function slotToRow(slot: ItinerarySlot): SlotRow {
  return {
    slot_key: slot.slotKey,
    day: slot.day,
    position: slot.position,
    time_label: slot.time,
    slot_type: slot.type,
    content: slot.text,
  }
}

function readLocal(): ItinerarySlot[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as ItinerarySlot[]) : null
  } catch {
    return null
  }
}

function writeLocal(slots: ItinerarySlot[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(slots))
  } catch {
    /* storage full / private mode — state still holds in memory */
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'slot'
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export interface UseItinerary {
  slotsForDay(day: number): ItinerarySlot[]
  syncStatus: SyncStatus
  loaded: boolean
  updateSlot(slotKey: string, patch: Partial<Pick<ItinerarySlot, 'time' | 'type' | 'text'>>): void
  reorderSlot(day: number, slotKey: string, toIndex: number): void
  addSlot(day: number, input: { time: string; type: SlotType; text: string }): void
  removeSlot(slotKey: string): { restore(): void }
  beginEditing(slotKey: string): void
  endEditing(slotKey: string): void
}

/** Itinerary sync engine (API.md §3d, DATA_MODEL.md §6). Load → seed-if-empty
 * (race-proof upsert) → Map<slotKey, Slot> state; update/insert/delete by
 * slot_key; fractional-position reorder + renumber guard; realtime channel;
 * localStorage snapshot + open-mode fallback; last-write-wins. */
export function useItinerary(auth: AuthState): UseItinerary {
  const [slots, setSlots] = useState<Map<string, ItinerarySlot>>(new Map())
  const [loaded, setLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    auth.status === 'open' ? 'local-only' : 'saving',
  )
  const editingKeys = useRef<Set<string>>(new Set())
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  const beginEditing = useCallback((slotKey: string) => {
    editingKeys.current.add(slotKey)
  }, [])
  const endEditing = useCallback((slotKey: string) => {
    editingKeys.current.delete(slotKey)
  }, [])

  const snapshotToLocal = useCallback((map: Map<string, ItinerarySlot>) => {
    writeLocal([...map.values()])
  }, [])

  // Apply an incoming (remote or local-optimistic) slot into state, skipping
  // slots currently focused for local edits — "local uncommitted text wins
  // until blur" (ARCHITECTURE.md §8).
  const upsertLocal = useCallback((slot: ItinerarySlot, opts?: { skipIfEditing?: boolean }) => {
    if (opts?.skipIfEditing && editingKeys.current.has(slot.slotKey)) return
    setSlots((prev) => {
      const next = new Map(prev)
      next.set(slot.slotKey, slot)
      return next
    })
  }, [])

  const dropLocal = useCallback((slotKey: string) => {
    setSlots((prev) => {
      if (!prev.has(slotKey)) return prev
      const next = new Map(prev)
      next.delete(slotKey)
      return next
    })
  }, [])

  // ── initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadOpenMode() {
      let local = readLocal()
      if (!local || local.length === 0) {
        local = ITINERARY_SEED
        writeLocal(local)
      }
      if (cancelled) return
      setSlots(new Map(local.map((s) => [s.slotKey, s])))
      setSyncStatus('local-only')
      setLoaded(true)
    }

    async function loadSignedIn() {
      if (!supabase) return
      setSyncStatus('saving')
      const { data, error } = await supabase
        .from(TABLES.slots)
        .select('*')
        .order('day', { ascending: true })
        .order('position', { ascending: true })

      if (cancelled) return

      if (error) {
        // Offline / unreachable — render from the localStorage snapshot.
        const local = readLocal() ?? ITINERARY_SEED
        setSlots(new Map(local.map((s) => [s.slotKey, s])))
        setSyncStatus('error')
        setLoaded(true)
        return
      }

      let rows = (data ?? []) as SlotRow[]

      if (rows.length === 0) {
        // Seed-if-empty, race-proof (DATA_MODEL.md §6f).
        await supabase
          .from(TABLES.slots)
          .upsert(ITINERARY_SEED.map(slotToRow), { onConflict: 'slot_key', ignoreDuplicates: true })
        const reload = await supabase
          .from(TABLES.slots)
          .select('*')
          .order('day', { ascending: true })
          .order('position', { ascending: true })
        rows = (reload.data ?? []) as SlotRow[]
        if (rows.length === 0) rows = ITINERARY_SEED.map(slotToRow)
      }

      if (cancelled) return
      const map = new Map(rows.map((r) => [r.slot_key, rowToSlot(r)]))
      setSlots(map)
      snapshotToLocal(map)
      setSyncStatus('synced')
      setLoaded(true)
    }

    if (auth.status === 'open') {
      loadOpenMode()
    } else if (auth.status === 'signedIn') {
      loadSignedIn()
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status])

  // ── realtime subscription (signed-in only) ────────────────────────────
  useEffect(() => {
    if (auth.status !== 'signedIn' || !supabase) return
    const client = supabase

    const channel: RealtimeChannel = client
      .channel('itinerary-slots-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.slots },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as SlotRow
            if (old.slot_key) dropLocal(old.slot_key)
          } else {
            upsertLocal(rowToSlot(payload.new as SlotRow), { skipIfEditing: true })
          }
        },
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [auth.status, dropLocal, upsertLocal])

  // ── mutations ──────────────────────────────────────────────────────────
  const persist = useCallback(
    async (map: Map<string, ItinerarySlot>, op: () => Promise<{ error: unknown } | void>) => {
      snapshotToLocal(map)
      if (auth.status !== 'signedIn' || !supabase) {
        setSyncStatus('local-only')
        return
      }
      setSyncStatus('saving')
      try {
        const result = await op()
        if (result && (result as { error: unknown }).error) throw (result as { error: unknown }).error
        setSyncStatus('synced')
      } catch {
        // Keep the optimistic local state; surface the inline sync note.
        setSyncStatus('error')
      }
    },
    [auth.status, snapshotToLocal],
  )

  const updateSlot = useCallback(
    (slotKey: string, patch: Partial<Pick<ItinerarySlot, 'time' | 'type' | 'text'>>) => {
      const existing = slotsRef.current.get(slotKey)
      if (!existing) return
      const updated: ItinerarySlot = { ...existing, ...patch }
      const next = new Map(slotsRef.current)
      next.set(slotKey, updated)
      setSlots(next)
      persist(next, async () => {
        if (!supabase) return
        return supabase
          .from(TABLES.slots)
          .update({
            content: updated.text,
            time_label: updated.time,
            slot_type: updated.type,
          })
          .eq('slot_key', slotKey)
      })
    },
    [persist],
  )

  const reorderSlot = useCallback(
    (day: number, slotKey: string, toIndex: number) => {
      const daySlots = [...slotsRef.current.values()]
        .filter((s) => s.day === day)
        .sort((a, b) => a.position - b.position || a.slotKey.localeCompare(b.slotKey))
      const moving = daySlots.find((s) => s.slotKey === slotKey)
      if (!moving) return
      const without = daySlots.filter((s) => s.slotKey !== slotKey)
      const insertAt = Math.max(0, Math.min(toIndex, without.length))
      const prev = without[insertAt - 1]
      const next = without[insertAt]

      let newPosition: number
      if (!prev && !next) newPosition = 10
      else if (!prev) newPosition = next.position - 10
      else if (!next) newPosition = prev.position + 10
      else newPosition = (prev.position + next.position) / 2

      const tooClose =
        (prev && Math.abs(newPosition - prev.position) < RENUMBER_EPSILON) ||
        (next && Math.abs(newPosition - next.position) < RENUMBER_EPSILON)

      if (tooClose) {
        // Renumber guard (DATA_MODEL.md §6c, API.md §3e) — rewrite the whole
        // day back onto the 10-lattice in one batched pass.
        const ordered = [...without]
        ordered.splice(insertAt, 0, moving)
        const renumbered = ordered.map((s, i) => ({ ...s, position: (i + 1) * 10 }))
        const map = new Map(slotsRef.current)
        for (const s of renumbered) map.set(s.slotKey, s)
        setSlots(map)
        persist(map, async () => {
          if (!supabase) return
          return supabase
            .from(TABLES.slots)
            .upsert(renumbered.map(slotToRow), { onConflict: 'slot_key' })
        })
        return
      }

      const updated: ItinerarySlot = { ...moving, position: newPosition }
      const map = new Map(slotsRef.current)
      map.set(slotKey, updated)
      setSlots(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.slots).update({ position: newPosition }).eq('slot_key', slotKey)
      })
    },
    [persist],
  )

  const addSlot = useCallback(
    (day: number, input: { time: string; type: SlotType; text: string }) => {
      const daySlots = [...slotsRef.current.values()].filter((s) => s.day === day)
      const lastPosition = daySlots.reduce((max, s) => Math.max(max, s.position), 0)
      const slotKey = `d${pad(day)}-user-${Date.now()}-${slugify(input.text)}`
      const slot: ItinerarySlot = {
        slotKey,
        day,
        position: lastPosition + 10,
        time: input.time,
        type: input.type,
        text: input.text,
      }
      const map = new Map(slotsRef.current)
      map.set(slotKey, slot)
      setSlots(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.slots).insert(slotToRow(slot))
      })
    },
    [persist],
  )

  const removeSlot = useCallback(
    (slotKey: string) => {
      const existing = slotsRef.current.get(slotKey)
      if (!existing) return { restore() {} }

      const map = new Map(slotsRef.current)
      map.delete(slotKey)
      setSlots(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.slots).delete().eq('slot_key', slotKey)
      })

      return {
        restore() {
          const restored = new Map(slotsRef.current)
          restored.set(slotKey, existing)
          setSlots(restored)
          persist(restored, async () => {
            if (!supabase) return
            return supabase.from(TABLES.slots).insert(slotToRow(existing))
          })
        },
      }
    },
    [persist],
  )

  const slotsForDay = useCallback(
    (day: number): ItinerarySlot[] =>
      [...slots.values()]
        .filter((s) => s.day === day)
        .sort((a, b) => a.position - b.position || a.slotKey.localeCompare(b.slotKey)),
    [slots],
  )

  return useMemo(
    () => ({
      slotsForDay,
      syncStatus,
      loaded,
      updateSlot,
      reorderSlot,
      addSlot,
      removeSlot,
      beginEditing,
      endEditing,
    }),
    [slotsForDay, syncStatus, loaded, updateSlot, reorderSlot, addSlot, removeSlot, beginEditing, endEditing],
  )
}
