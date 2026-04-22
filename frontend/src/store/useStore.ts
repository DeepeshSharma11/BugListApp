import create from 'zustand'

interface User {
  id?: string
  email?: string
  full_name?: string
  role?: string
  team_id?: string
}

interface State {
  user: User | null
  setUser: (u: User | null) => void
}

export const useStore = create<State>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
}))
