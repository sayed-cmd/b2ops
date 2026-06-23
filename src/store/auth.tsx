import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    // Retry up to 3 times — user row may not exist yet (trigger delay)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('*, team:teams(*)')
        .eq('id', authUserId)
        .single()

      if (data) return data as User

      if (error?.code === 'PGRST116') {
        // Row not found yet — wait and retry
        await new Promise((r) => setTimeout(r, 800))
        continue
      }

      console.error('Error fetching user profile:', error)
      return null
    }
    return null
  }, [])

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const profile = await fetchUserProfile(authUser.id)
      setUser(profile)
    }
  }, [fetchUserProfile])

  useEffect(() => {
    // Handle OAuth callback — Supabase exchanges the code automatically
    // We just need to listen for the SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setUser(profile)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id)
            setUser(profile)
          }
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Must match exactly what's in Supabase → Auth → URL Configuration
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
