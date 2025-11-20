"use client"

import { createContext, useCallback, useContext, useState } from "react"
import type { SessionUser } from "@/types"

interface AuthContextValue {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser: SessionUser | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session")
      const result = await response.json()
      setUser(result.user ?? null)
    } catch (error) {
      console.error("Failed to refresh session", error)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
