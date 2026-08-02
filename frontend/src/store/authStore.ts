import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  tenant_id: string | null;
  avatar_url: string | null;
  permissions: Record<string, string[]>;
  roles?: { id: string; name: string; slug?: string }[];
  totp_enabled?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  selectedTenantId: string | null;

  setAuth: (accessToken: string, refreshToken: string, user: UserInfo) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSelectedTenantId: (id: string | null) => void;
  logout: () => void;

  // Permission helpers
  can: (module: string, action: string) => boolean;
  hasModule: (module: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      selectedTenantId: null,

      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true, selectedTenantId: null }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setSelectedTenantId: (id) =>
        set({ selectedTenantId: id }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, selectedTenantId: null }),

      can: (module: string, action: string): boolean => {
        const { user } = get();
        if (!user) return false;
        if (user.is_super_admin) return true;
        return (user.permissions[module] || []).includes(action);
      },

      hasModule: (module: string): boolean => {
        const { user } = get();
        if (!user) return false;
        if (user.is_super_admin) return true;
        return Object.keys(user.permissions).includes(module);
      },
    }),
    {
      name: 'hissob-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedTenantId: state.selectedTenantId,
      }),
    }
  )
);
