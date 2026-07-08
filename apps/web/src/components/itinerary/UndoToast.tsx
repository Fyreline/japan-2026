import { useEffect } from 'react'

/** Bottom-centre toast, 5s auto-dismiss, offering to undo a slot removal
 * (DESIGN.md §6.4/§5). */
export function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string
  onUndo(): void
  onDismiss(): void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-paper shadow-float">
        <span>{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="font-medium text-clay underline underline-offset-2 hover:text-clay-deep"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
