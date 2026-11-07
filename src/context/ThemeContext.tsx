import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'dark' | 'gemini' | 'midnight' | 'cyberpunk' | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  previewBg: string;
  previewAccent: string;
  isDark: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Dark Obsidian',
    description: 'Deep high-contrast obsidian dark palette (Default)',
    previewBg: '#090d16',
    previewAccent: '#6366f1',
    isDark: true,
  },
  {
    id: 'gemini',
    name: 'Gemini Aurora',
    description: 'Google Gemini chromatic flow with luminous violet & blue',
    previewBg: '#070a14',
    previewAccent: '#4285F4',
    isDark: true,
  },
  {
    id: 'midnight',
    name: 'Midnight Navy',
    description: 'Deep ocean cobalt with crisp electric blue accents',
    previewBg: '#040816',
    previewAccent: '#2563eb',
    isDark: true,
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Matrix',
    description: 'Obsidian carbon with precision emerald accent lines',
    previewBg: '#060b09',
    previewAccent: '#10b981',
    isDark: true,
  },
  {
    id: 'light',
    name: 'Clean Light',
    description: 'Crisp daylight mode with pure white cards & high contrast',
    previewBg: '#f8fafc',
    previewAccent: '#4f46e5',
    isDark: false,
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  availableThemes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  availableThemes: THEME_OPTIONS,
});

const THEME_STORAGE_KEY = 'codemate_theme_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  const applyThemeToDOM = (t: ThemeId) => {
    const root = document.documentElement;
    root.dataset.theme = t;
    if (document.body) {
      document.body.dataset.theme = t;
    }
    if (t === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    // Quick toggle between primary dark and light, or cycle
    const next: Record<ThemeId, ThemeId> = {
      dark: 'gemini',
      gemini: 'midnight',
      midnight: 'cyberpunk',
      cyberpunk: 'light',
      light: 'dark',
    };
    setTheme(next[theme] || 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, availableThemes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

