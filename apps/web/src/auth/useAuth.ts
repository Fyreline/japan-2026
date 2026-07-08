import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// API.md §1b. A thin subscription over supabase-js — no token machinery.
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

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>(
    supabase ? { status: 'loading' } : { status: 'open' },
  )

  useEffect(() => {
    if (!supabase) return

    let active = true

    // Resolves from localStorage — no network round-trip needed (API.md §1a).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setState(
        session
          ? { status: 'signedIn', user: session.user }
          : { status: 'signedOut' },
      )
    })

    // Drives every later transition: SIGNED_IN, SIGNED_OUT, token refresh,
    // revocation. Token refresh is invisible.
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

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    // error.message is shown verbatim in the login form's error line.
    return { error: error ? error.message : null }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    // onAuthStateChange re-raises the gate — no manual bookkeeping.
  }

  return { state, signIn, signOut }
}
