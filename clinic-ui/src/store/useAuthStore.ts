import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  user_id: number;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  linked_entity_id: number | null;
  display_name: string; // username for staff, phone for patients
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,
      setAuth: (accessToken, user, refreshToken) =>
        set({ accessToken, refreshToken: refreshToken ?? null, isAuthenticated: true, user }),
      logout: () => set({ accessToken: null, refreshToken: null, isAuthenticated: false, user: null }),
    }),
    { name: 'clinic-auth-secure-jar' }
  )
);
