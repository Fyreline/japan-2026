import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'japan-theme'

// The pre-paint script in index.html has already stamped `.dark` on <html>
// (from stored choice, else OS preference) before React mounts — this store
// mirrors and mutates that single source of truth rather than re-deciding it
// (ARCHITECTURE.md §9). A tiny subscribe/notify store so ThemeToggle and
// MapView (tile-set swap) share one theme identity.
const listeners = new Set<() => void>()

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* private mode — the DOM class is still applied */
  }
  listeners.forEach((cb) => cb())
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light')
}
