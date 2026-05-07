import { create } from 'zustand'

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  tenantId: string
  role: 'admin' | 'manager' | 'editor' | 'viewer' | 'supplier'
  assignedFolders?: string[]
}

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, loading: false }),
}))
