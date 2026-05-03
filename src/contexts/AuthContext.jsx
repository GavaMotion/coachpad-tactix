import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Read whatever Supabase persisted in localStorage so the app can boot
// offline without waiting on a network token refresh. The default v2
// storageKey is sb-<project-ref>-auth-token.
function readCachedSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      const candidate = parsed?.currentSession ?? parsed
      if (candidate && candidate.access_token && candidate.user) return candidate
    }
  } catch { /* corrupt or unavailable storage */ }
  return null
}

export function AuthProvider({ children }) {
  // Start with the cached session so the UI is never gated on a network call.
  const [session, setSession] = useState(() => readCachedSession())

  useEffect(() => {
    let mounted = true

    // Confirm with Supabase, but don't block rendering on it.
    supabase.auth.getSession()
      .then(({ data: { session: live } }) => {
        if (mounted) setSession(live)
      })
      .catch(() => { /* offline or refresh failure — keep cached session */ })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
