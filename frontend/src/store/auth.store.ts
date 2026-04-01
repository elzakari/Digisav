import { create } from 'zustand';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  theme?: string | null;
  language?: string | null;
  defaultCurrency?: string | null;
  countryCode?: string | null;
  optedOutOfGroupSavings?: boolean | null;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));
