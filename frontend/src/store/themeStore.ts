import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyThemeToDOM = (effective: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.style.colorScheme = effective;
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      effectiveTheme: 'light',

      setMode: (mode: ThemeMode) => {
        const effective = mode === 'system' ? getSystemTheme() : mode;
        applyThemeToDOM(effective);
        set({ mode, effectiveTheme: effective });
      },

      toggleTheme: () => {
        const { effectiveTheme } = get();
        const nextMode = effectiveTheme === 'dark' ? 'light' : 'dark';
        applyThemeToDOM(nextMode);
        set({ mode: nextMode, effectiveTheme: nextMode });
      },

      initTheme: () => {
        const { mode } = get();
        const effective = mode === 'system' ? getSystemTheme() : mode;
        applyThemeToDOM(effective);
        set({ effectiveTheme: effective });
      },
    }),
    {
      name: 'hissob-theme-storage',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

// Listen to system preference changes if mode is 'system'
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
      setMode('system');
    }
  });
}
