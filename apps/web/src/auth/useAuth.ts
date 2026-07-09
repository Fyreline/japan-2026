import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// API.md §1b. A thin subscription over supabase-js — no token machinery.
// UNCHANGED by the shared-login extension (API.md §1, docs/AUTH.md).
export type AuthState =
  | { status: 'open' } //        supabase === null
  | { status: 'loading' } //     getSession in flight
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

export interface UseAuth {
  state: AuthState
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
}

// docs/AUTH.md / API.md §9a. Japan's login proxy — verifies against Mishka
// Hub, mints a genuine Supabase session, hands it over. Defaults to the
// production tunnel hostname so the Pages build needs no new repo variable;
// .env.local overrides it for local dev against a local proxy instance
// (ARCHITECTURE.md §20d).
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE ?? 'https://japan-api.mishka-hub.com'

// Hardcoded fallback for when the fetch to the proxy itself fails (tunnel/
// Mac unreachable) — the same copy as the server's identity_unavailable body,
// per API.md §1a's comment ("fetch/network failure → the §9a 503 copy,
// hardcoded as the fallback line").
const PROXY_UNREACHABLE_DETAIL =
  "Mishka Hub isn't reachable — Japan borrows its login. Is it running?"

interface LoginResponseBody {
  access_token?: string
  refresh_token?: string
  detail?: string
}

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>(
    supabase ? { status: 'loading' } : { status: 'open' },
  )

  useEffect(() => {
    if (!supabase) return

    let active = true

    // Resolves from localStorage — no network round-trip needed (API.md §1a).
    // UNCHANGED by §9.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setState(
        session
          ? { status: 'signedIn', user: session.user }
          : { status: 'signedOut' },
      )
    })

    // Drives every later transition: SIGNED_IN, SIGNED_OUT, token refresh,
    // revocation. Token refresh is invisible. UNCHANGED by §9.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'signedIn', user: session.user }
          : { status: 'signedOut' },
      )
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // REPLACED by §9 (API.md §1a): credentials go to Japan's own login proxy,
  // which verifies them against Mishka Hub and returns a genuine Supabase
  // session pair; the SPA adopts it with setSession(). This is the entire
  // change — getSession/onAuthStateChange/signOut above are untouched.
  async function signIn(email: string, password: string) {
    if (!supabase) return { error: null }

    let body: LoginResponseBody
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      body = (await res.json().catch(() => ({}))) as LoginResponseBody
      // body?.detail → shown verbatim in the form's text-fig error line
      if (!res.ok) {
        return { error: body.detail ?? PROXY_UNREACHABLE_DETAIL }
      }
    } catch {
      // The fetch itself failed — the proxy/tunnel/Mac is unreachable.
      return { error: PROXY_UNREACHABLE_DETAIL }
    }

    if (!body.access_token || !body.refresh_token) {
      return { error: PROXY_UNREACHABLE_DETAIL }
    }

    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    })
    // From here it is a completely normal Supabase session — persisted and
    // auto-refreshed by supabase-js with zero further involvement from the
    // proxy (ARCHITECTURE.md §20e).
    return { error: error ? error.message : null }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    // onAuthStateChange re-raises the gate — no manual bookkeeping.
    // UNCHANGED by §9.
  }

  return { state, signIn, signOut }
}
