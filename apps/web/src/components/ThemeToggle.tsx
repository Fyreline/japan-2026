import { useTheme, toggleTheme } from '../hooks/useTheme'

/** Icon-button theme toggle (port of Mishka's, storage key 'japan-theme').
 * Persistence + OS-preference default live in useTheme / the pre-paint
 * script; this only reads and flips. */
export function ThemeToggle() {
  const theme = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-paper text-ink-mid transition hover:bg-oat hover:text-ink"
    >
      {theme === 'dark' ? (
        // Sun — shown in dark mode ("tap to go light").
        <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
          <circle cx="10" cy="10" r="4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="10" y1="1.2" x2="10" y2="3.2" />
            <line x1="10" y1="16.8" x2="10" y2="18.8" />
            <line x1="1.2" y1="10" x2="3.2" y2="10" />
            <line x1="16.8" y1="10" x2="18.8" y2="10" />
            <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
            <line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
            <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
            <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
          </g>
        </svg>
      ) : (
        // Crescent moon — shown in light mode ("tap to go dark").
        <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
          <path d="M16.5 12.9A7 7 0 0 1 7.1 3.5a7 7 0 1 0 9.4 9.4Z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}
