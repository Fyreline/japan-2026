import { useSyncExternalStore } from 'react'

// navigator.onLine + online/offline events → OfflineBanner (ARCHITECTURE.md
// §14d). A tiny subscribe/notify store, same shape as useTheme.ts.
function subscribe(cb: () => void): () => void {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function getSnapshot(): boolean {
  return navigator.onLine
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
