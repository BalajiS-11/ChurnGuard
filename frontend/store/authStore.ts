import { create } from "zustand"
import { api } from "@/lib/api"

export interface User {
  id: string
  email: string
  full_name: string
  role: "admin" | "manager" | "rm" | "analyst"
  avatar_url?: string
  preferences?: Record<string, any>
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, refresh: string, user: User) => void
  logout: () => void
  fetchCurrentUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("churnguard_access_token") : null,
  isLoading: true,
  login: (token, refresh, user) => {
    localStorage.setItem("churnguard_access_token", token)
    localStorage.setItem("churnguard_refresh_token", refresh)
    set({ token, user, isLoading: false })
  },
  logout: () => {
    localStorage.removeItem("churnguard_access_token")
    localStorage.removeItem("churnguard_refresh_token")
    set({ user: null, token: null, isLoading: false })
  },
  fetchCurrentUser: async () => {
    try {
      const res = await api.get("/auth/me")
      set({ user: res.data, isLoading: false })
    } catch (e) {
      set({ user: null, token: null, isLoading: false })
    }
  }
}))
