import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'dark' | 'midnight' | 'slate' | 'emerald' | 'violet' | 'light';

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
    name: 'Obsidian',
    description: 'Deep high-contrast charcoal canvas (Default)',
    previewBg: '#090d16',
    previewAccent: '#6366f1',
    isDark: true,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep ocean cobalt with vivid electric blue',
    previewBg: '#040816',
    previewAccent: '#3b82f6',
    isDark: true,
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Monochrome zinc carbon with cyan steel accents',
    previewBg: '#0d1117',
    previewAccent: '#38bdf8',
    isDark: true,
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Forest obsidian with crisp mint accents',
    previewBg: '#060d0a',
    previewAccent: '#10b981',
    isDark: true,
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Deep plum palette with lilac purple accents',
    previewBg: '#0f0a1a',
    previewAccent: '#a855f7',
    isDark: true,
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Crisp daylight paper mode with pure white cards',
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
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        if (THEME_OPTIONS.some((t) => t.id === saved)) {
          return saved as ThemeId;
        }
        // Legacy migration mappings
        if (saved === 'gemini') return 'midnight';
        if (saved === 'cyberpunk' || saved === 'openai') return 'emerald';
        if (saved === 'dracula' || saved === 'claude') return 'violet';
        if (saved === 'nord') return 'slate';
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
    const order: ThemeId[] = ['dark', 'midnight', 'slate', 'emerald', 'violet', 'light'];
    const currentIndex = order.indexOf(theme);
    const nextTheme = order[(currentIndex + 1) % order.length];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, availableThemes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

