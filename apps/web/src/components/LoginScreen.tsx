import { useState } from 'react'
import { ToriiMark } from './ToriiMark'

/** Full-screen sign-in gate — MishkaHub's LoginScreen layout, re-marked with
 * the torii (DESIGN.md §5). The only two accounts that will ever exist are
 * seeded in the Supabase dashboard; there is no registration path anywhere. */
export function LoginScreen({
  onSignIn,
}: {
  onSignIn(email: string, password: string): Promise<{ error: string | null }>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await onSignIn(email, password)
    setBusy(false)
    if (error) setError(error)
    else setPassword('')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-paper px-5 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="text-clay">
            <ToriiMark size={48} />
          </span>
          <span className="font-display text-2xl font-medium tracking-[-0.005em]">
            Japan <span className="text-clay">2026</span>
          </span>
          <p className="font-serif text-lg text-ink-mid">
            Two of you, two weeks, one plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="min-h-11 w-full rounded-md border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-cloud focus:border-clay"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="min-h-11 w-full rounded-md border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-cloud focus:border-clay"
          />

          {error && <p className="text-sm text-fig">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-md bg-clay py-2.5 text-sm font-medium text-paper transition hover:bg-clay-deep disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-soft">
          Just the two of you — same accounts as always.
        </p>
      </div>
    </div>
  )
}
