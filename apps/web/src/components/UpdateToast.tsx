import { useRegisterSW } from 'virtual:pwa-register/react'

/** "New version ready" toast (DESIGN.md §12c, ARCHITECTURE.md §14d).
 * `registerType: 'prompt'` is deliberate — a SW swap mid-edit is exactly the
 * wrong moment, so this only ever refreshes on tap. No SW is registered in
 * dev (devOptions.enabled: false), so this renders nothing there. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-paper shadow-float">
        <span>A new version is ready</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="font-medium text-paper underline underline-offset-2"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss — update later"
          className="text-paper/70 hover:text-paper"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
