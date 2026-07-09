import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLES } from '../lib/supabase'
import type { AuthState } from '../auth/useAuth'
import { PACKING_SEED } from '../data/packingSeed'
import type { PackingCategory, PackingItem } from '../data/types'
import { PACKING_CATEGORIES } from '../data/types'

const LOCAL_KEY = 'japan2026PackingItems'
const CATEGORY_IDS = PACKING_CATEGORIES.map((c) => c.id)

export type SyncStatus = 'synced' | 'saving' | 'error' | 'local-only'

// ── row <-> client mapping (DATA_MODEL.md §11c) ───────────────────────────
interface PackingRow {
  item_key: string
  category?: string | null
  label?: string | null
  checked?: boolean | null
  position: number
}

function rowToItem(row: PackingRow): PackingItem {
  const category = (CATEGORY_IDS as string[]).includes(row.category ?? '')
    ? (row.category as PackingCategory)
    : 'other'
  return {
    itemKey: row.item_key,
    category,
    label: row.label ?? '',
    checked: Boolean(row.checked),
    position: Number(row.position),
  }
}

function itemToRow(item: PackingItem): PackingRow {
  return {
    item_key: item.itemKey,
    category: item.category,
    label: item.label,
    checked: item.checked,
    position: item.position,
  }
}

function readLocal(): PackingItem[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as PackingItem[]) : null
  } catch {
    return null
  }
}

function writeLocal(items: PackingItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
  } catch {
    /* storage full / private mode */
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'item'
  )
}

export interface UsePacking {
  itemsForCategory(category: PackingCategory): PackingItem[]
  allItems: PackingItem[]
  syncStatus: SyncStatus
  loaded: boolean
  toggleChecked(itemKey: string): void
  updateLabel(itemKey: string, label: string): void
  addItem(category: PackingCategory, label: string): void
  removeItem(itemKey: string): { restore(): void }
}

/** usePacking — useItinerary with the serial numbers filed off (ARCHITECTURE.md
 * §17): same load → seed-if-empty → keyed Map → optimistic mutations →
 * snapshot → realtime → open-mode fallback, category standing in for day,
 * no drag machinery (DATA_MODEL.md §11e). */
export function usePacking(auth: AuthState): UsePacking {
  const [items, setItems] = useState<Map<string, PackingItem>>(new Map())
  const [loaded, setLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    auth.status === 'open' ? 'local-only' : 'saving',
  )
  const itemsRef = useRef(items)
  itemsRef.current = items

  const snapshotToLocal = useCallback((map: Map<string, PackingItem>) => {
    writeLocal([...map.values()])
  }, [])

  // ── initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadOpenMode() {
      let local = readLocal()
      if (!local || local.length === 0) {
        local = PACKING_SEED
        writeLocal(local)
      }
      if (cancelled) return
      setItems(new Map(local.map((i) => [i.itemKey, i])))
      setSyncStatus('local-only')
      setLoaded(true)
    }

    async function loadSignedIn() {
      if (!supabase) return
      setSyncStatus('saving')
      const { data, error } = await supabase
        .from(TABLES.packing)
        .select('*')
        .order('category', { ascending: true })
        .order('position', { ascending: true })

      if (cancelled) return

      if (error) {
        const local = readLocal() ?? PACKING_SEED
        setItems(new Map(local.map((i) => [i.itemKey, i])))
        setSyncStatus('error')
        setLoaded(true)
        return
      }

      let rows = (data ?? []) as PackingRow[]

      if (rows.length === 0) {
        await supabase
          .from(TABLES.packing)
          .upsert(PACKING_SEED.map(itemToRow), { onConflict: 'item_key', ignoreDuplicates: true })
        const reload = await supabase
          .from(TABLES.packing)
          .select('*')
          .order('category', { ascending: true })
          .order('position', { ascending: true })
        rows = (reload.data ?? []) as PackingRow[]
        if (rows.length === 0) rows = PACKING_SEED.map(itemToRow)
      }

      if (cancelled) return
      const map = new Map(rows.map((r) => [r.item_key, rowToItem(r)]))
      setItems(map)
      snapshotToLocal(map)
      setSyncStatus('synced')
      setLoaded(true)
    }

    if (auth.status === 'open') loadOpenMode()
    else if (auth.status === 'signedIn') loadSignedIn()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status])

  // ── realtime (signed-in only) ────────────────────────────────────────
  useEffect(() => {
    if (auth.status !== 'signedIn' || !supabase) return
    const client = supabase

    const channel: RealtimeChannel = client
      .channel('packing-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.packing },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { item_key?: string }
            if (!old.item_key) return
            setItems((prev) => {
              if (!prev.has(old.item_key!)) return prev
              const next = new Map(prev)
              next.delete(old.item_key!)
              return next
            })
          } else {
            const row = rowToItem(payload.new as PackingRow)
            setItems((prev) => {
              const next = new Map(prev)
              next.set(row.itemKey, row)
              return next
            })
          }
        },
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [auth.status])

  // ── mutations ────────────────────────────────────────────────────────
  const persist = useCallback(
    async (map: Map<string, PackingItem>, op: () => Promise<{ error: unknown } | void>) => {
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
        setSyncStatus('error')
      }
    },
    [auth.status, snapshotToLocal],
  )

  const toggleChecked = useCallback(
    (itemKey: string) => {
      const existing = itemsRef.current.get(itemKey)
      if (!existing) return
      const updated: PackingItem = { ...existing, checked: !existing.checked }
      const map = new Map(itemsRef.current)
      map.set(itemKey, updated)
      setItems(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.packing).update({ checked: updated.checked }).eq('item_key', itemKey)
      })
    },
    [persist],
  )

  const updateLabel = useCallback(
    (itemKey: string, label: string) => {
      const existing = itemsRef.current.get(itemKey)
      if (!existing) return
      const updated: PackingItem = { ...existing, label }
      const map = new Map(itemsRef.current)
      map.set(itemKey, updated)
      setItems(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.packing).update({ label }).eq('item_key', itemKey)
      })
    },
    [persist],
  )

  const addItem = useCallback(
    (category: PackingCategory, label: string) => {
      const inCategory = [...itemsRef.current.values()].filter((i) => i.category === category)
      const lastPosition = inCategory.reduce((max, i) => Math.max(max, i.position), 0)
      const itemKey = `pk-user-${Date.now()}-${slugify(label)}`
      const item: PackingItem = { itemKey, category, label, checked: false, position: lastPosition + 10 }
      const map = new Map(itemsRef.current)
      map.set(itemKey, item)
      setItems(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.packing).insert(itemToRow(item))
      })
    },
    [persist],
  )

  const removeItem = useCallback(
    (itemKey: string) => {
      const existing = itemsRef.current.get(itemKey)
      if (!existing) return { restore() {} }

      const map = new Map(itemsRef.current)
      map.delete(itemKey)
      setItems(map)
      persist(map, async () => {
        if (!supabase) return
        return supabase.from(TABLES.packing).delete().eq('item_key', itemKey)
      })

      return {
        restore() {
          const restored = new Map(itemsRef.current)
          restored.set(itemKey, existing)
          setItems(restored)
          persist(restored, async () => {
            if (!supabase) return
            return supabase.from(TABLES.packing).insert(itemToRow(existing))
          })
        },
      }
    },
    [persist],
  )

  const itemsForCategory = useCallback(
    (category: PackingCategory): PackingItem[] =>
      [...items.values()]
        .filter((i) => i.category === category)
        .sort((a, b) => a.position - b.position || a.itemKey.localeCompare(b.itemKey)),
    [items],
  )

  const allItems = useMemo(() => [...items.values()], [items])

  return useMemo(
    () => ({
      itemsForCategory,
      allItems,
      syncStatus,
      loaded,
      toggleChecked,
      updateLabel,
      addItem,
      removeItem,
    }),
    [itemsForCategory, allItems, syncStatus, loaded, toggleChecked, updateLabel, addItem, removeItem],
  )
}
