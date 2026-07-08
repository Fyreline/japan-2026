import type { AuthState } from '../auth/useAuth'
import { ToriiMark } from './ToriiMark'
import { ThemeToggle } from './ThemeToggle'
import { SeigaihaBand } from './Seigaiha'

const ROUTE_STRIP =
  '20 SEP – 3 OCT · GLASGOW → TOKYO → FUJI → HIROSHIMA → OSAKA → KYOTO → HOME'

/** Sticky header (DESIGN.md §4): mark + wordmark, route strip on ≥md, theme
 * toggle, and sign-out (or a quiet "Sign-in off" pill in open mode). The
 * seigaiha band sits under the border hairline. */
export function Header({
  auth,
  onSignOut,
}: {
  auth: AuthState
  onSignOut(): void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-none">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-clay">
            <ToriiMark size={30} />
          </span>
          <div>
            <span className="font-display text-xl font-bold tracking-[-0.005em] text-ink">
              Japan <span className="text-clay">2026</span>
            </span>
            <p className="mt-0.5 hidden font-mono text-[12px] leading-tight text-ink-soft md:block">
              {ROUTE_STRIP}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {auth.status === 'open' ? (
            <span className="rounded-full bg-oat px-3 py-1 text-xs font-medium text-ink-mid">
              Sign-in off
            </span>
          ) : auth.status === 'signedIn' ? (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-line-strong hover:text-ink"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
      <SeigaihaBand />
    </header>
  )
}
