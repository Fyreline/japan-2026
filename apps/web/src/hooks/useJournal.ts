import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLES, BUCKETS } from '../lib/supabase'
import type { AuthState } from '../auth/useAuth'
import { compressImage } from '../lib/images'
import type { JournalEntry } from '../data/types'

const LOCAL_KEY = 'japan2026JournalEntries'

export type SyncStatus = 'synced' | 'saving' | 'error' | 'local-only'

// ── row <-> client mapping (DATA_MODEL.md §12c) ───────────────────────────
interface JournalRow {
  entry_key: string
  entry_date: string
  body?: string | null
  photo_path?: string | null
}

function rowToEntry(row: JournalRow): JournalEntry {
  return {
    entryKey: row.entry_key,
    date: row.entry_date,
    text: row.body ?? '',
    photoPath: row.photo_path ?? null,
  }
}

function entryToRow(entry: JournalEntry): JournalRow {
  return {
    entry_key: entry.entryKey,
    entry_date: entry.date,
    body: entry.text,
    photo_path: entry.photoPath,
  }
}

// Text + photo path only — never photo binaries (DATA_MODEL.md §8).
function readLocal(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as JournalEntry[]
  } catch {
    return []
  }
}

function writeLocal(entries: JournalEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries))
  } catch {
    /* storage full / private mode */
  }
}

function sortNewestFirst(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.entryKey.localeCompare(a.entryKey))
}

function freshKey(): string {
  return `jr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export interface UseJournal {
  entries: JournalEntry[] // newest first
  loaded: boolean
  syncStatus: SyncStatus
  photosEnabled: boolean // false in open mode — Storage needs Supabase
  photoUrl(entryKey: string): string | null // memoised signed URL, or null until resolved
  requestPhotoUrl(entryKey: string, photoPath: string): void
  addEntry(input: { date: string; text: string; photoFile?: File | Blob | null }): void
  updateEntry(entryKey: string, patch: { date?: string; text?: string }): void
  attachPhoto(entryKey: string, file: File | Blob): Promise<void>
  removeEntry(entryKey: string): { restore(): void; commit(): void }
}

/** journal_entries CRUD + journal-photos Storage (API.md §7e, ARCHITECTURE.md
 * §19). Photo upload always goes through lib/images.ts's compressor first. */
export function useJournal(auth: AuthState): UseJournal {
  const [entries, setEntries] = useState<Map<string, JournalEntry>>(new Map())
  const [loaded, setLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    auth.status === 'open' ? 'local-only' : 'saving',
  )
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const pendingUrlFetch = useRef<Set<string>>(new Set())

  const snapshotToLocal = useCallback((map: Map<string, JournalEntry>) => {
    writeLocal([...map.values()])
  }, [])

  // ── initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadOpenMode() {
      const local = readLocal()
      if (cancelled) return
      setEntries(new Map(local.map((e) => [e.entryKey, e])))
      setSyncStatus('local-only')
      setLoaded(true)
    }

    async function loadSignedIn() {
      if (!supabase) return
      setSyncStatus('saving')
      const { data, error } = await supabase
        .from(TABLES.journal)
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        const local = readLocal()
        setEntries(new Map(local.map((e) => [e.entryKey, e])))
        setSyncStatus('error')
        setLoaded(true)
        return
      }

      const rows = (data ?? []) as JournalRow[]
      const map = new Map(rows.map((r) => [r.entry_key, rowToEntry(r)]))
      setEntries(map)
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

  // ── realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (auth.status !== 'signedIn' || !supabase) return
    const client = supabase

    const channel: RealtimeChannel = client
      .channel('journal-entries-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.journal },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { entry_key?: string }
            if (!old.entry_key) return
            setEntries((prev) => {
              if (!prev.has(old.entry_key!)) return prev
              const next = new Map(prev)
              next.delete(old.entry_key!)
              return next
            })
          } else {
            const row = rowToEntry(payload.new as JournalRow)
            setEntries((prev) => new Map(prev).set(row.entryKey, row))
          }
        },
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [auth.status])

  const persist = useCallback(
    async (map: Map<string, JournalEntry>, op: (() => Promise<{ error: unknown } | void>) | null) => {
      snapshotToLocal(map)
      if (auth.status !== 'signedIn' || !supabase || !op) {
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

  const attachPhoto = useCallback(
    async (entryKey: string, file: File | Blob) => {
      if (!supabase) return // open mode: photo UI is hidden, nothing to do
      const client = supabase // narrowed non-null for the closures below
      try {
        const blob = await compressImage(file) // ALWAYS through the compressor
        const path = `${entryKey}.jpg`
        const { error: uploadError } = await client.storage
          .from(BUCKETS.journalPhotos)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (uploadError) throw uploadError

        const existing = entriesRef.current.get(entryKey)
        if (!existing) return
        const updated: JournalEntry = { ...existing, photoPath: path }
        const map = new Map(entriesRef.current)
        map.set(entryKey, updated)
        setEntries(map)
        await persist(map, async () =>
          client.from(TABLES.journal).update({ photo_path: path }).eq('entry_key', entryKey),
        )
      } catch {
        // Row + text stand; the photo slot shows a quiet retry control —
        // no queued upload (ARCHITECTURE.md §8/§19).
        setSyncStatus('error')
      }
    },
    [persist],
  )

  const addEntry = useCallback(
    (input: { date: string; text: string; photoFile?: File | Blob | null }) => {
      const entryKey = freshKey()
      const entry: JournalEntry = {
        entryKey,
        date: input.date,
        text: input.text,
        photoPath: null,
      }
      const map = new Map(entriesRef.current)
      map.set(entryKey, entry)
      setEntries(map)
      const client = supabase
      persist(map, client ? async () => client.from(TABLES.journal).insert(entryToRow(entry)) : null)

      if (input.photoFile) {
        attachPhoto(entryKey, input.photoFile)
      }
    },
    [persist, attachPhoto],
  )

  const updateEntry = useCallback(
    (entryKey: string, patch: { date?: string; text?: string }) => {
      const existing = entriesRef.current.get(entryKey)
      if (!existing) return
      const updated: JournalEntry = {
        ...existing,
        date: patch.date ?? existing.date,
        text: patch.text ?? existing.text,
      }
      const map = new Map(entriesRef.current)
      map.set(entryKey, updated)
      setEntries(map)
      const client = supabase
      persist(
        map,
        client
          ? async () =>
              client
                .from(TABLES.journal)
                .update({ body: updated.text, entry_date: updated.date })
                .eq('entry_key', entryKey)
          : null,
      )
    },
    [persist],
  )

  // Deferred delete (DESIGN.md §18.3): the ✕ removes the entry from local
  // state immediately (optimistic), but the actual object+row deletion is
  // deferred to `commit()` — the caller wires that to UndoToast's onDismiss,
  // which only fires once its own 5s window closes WITHOUT a click (clicking
  // Undo unmounts the toast, clearing its timer, so onDismiss never fires —
  // see UndoToast.tsx). "The object survives deletion attempts until the row
  // goes." `restore()` (Undo) just puts the entry back; nothing was ever
  // sent to Supabase in that path.
  const removeEntry = useCallback(
    (entryKey: string) => {
      const existing = entriesRef.current.get(entryKey)
      if (!existing) return { restore() {}, commit() {} }

      const map = new Map(entriesRef.current)
      map.delete(entryKey)
      setEntries(map)
      writeLocal([...map.values()]) // local snapshot only — no server call yet

      return {
        restore() {
          const restored = new Map(entriesRef.current)
          restored.set(entryKey, existing)
          setEntries(restored)
          writeLocal([...restored.values()])
        },
        commit() {
          if (auth.status !== 'signedIn' || !supabase) return
          const client = supabase
          ;(async () => {
            if (existing.photoPath) {
              await client.storage.from(BUCKETS.journalPhotos).remove([existing.photoPath])
            }
            await client.from(TABLES.journal).delete().eq('entry_key', entryKey)
          })()
        },
      }
    },
    [auth.status],
  )

  const requestPhotoUrl = useCallback(
    (entryKey: string, photoPath: string) => {
      if (!supabase || signedUrls.has(entryKey) || pendingUrlFetch.current.has(entryKey)) return
      pendingUrlFetch.current.add(entryKey)
      supabase.storage
        .from(BUCKETS.journalPhotos)
        .createSignedUrl(photoPath, 3600)
        .then(({ data }) => {
          pendingUrlFetch.current.delete(entryKey)
          if (data?.signedUrl) {
            setSignedUrls((prev) => new Map(prev).set(entryKey, data.signedUrl))
          }
        })
    },
    [signedUrls],
  )

  const photoUrl = useCallback((entryKey: string) => signedUrls.get(entryKey) ?? null, [signedUrls])

  const sortedEntries = useMemo(() => sortNewestFirst([...entries.values()]), [entries])

  return useMemo(
    () => ({
      entries: sortedEntries,
      loaded,
      syncStatus,
      photosEnabled: auth.status === 'signedIn',
      photoUrl,
      requestPhotoUrl,
      addEntry,
      updateEntry,
      attachPhoto,
      removeEntry,
    }),
    [
      sortedEntries,
      loaded,
      syncStatus,
      auth.status,
      photoUrl,
      requestPhotoUrl,
      addEntry,
      updateEntry,
      attachPhoto,
      removeEntry,
    ],
  )
}
