import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
  name: 'light',
  colors: {
    background: '#f8fafc',
    backgroundSecondary: '#ffffff',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#10b981',
    primaryLight: '#10b98120',
    danger: '#ef4444',
    dangerLight: '#ef444420',
    success: '#10b981',
    successLight: '#10b98120',
    warning: '#f59e0b',
    warningLight: '#f59e0b20',
    info: '#3b82f6',
    infoLight: '#3b82f620',
    border: '#e2e8f0',
    inputBg: '#f1f5f9',
    sidebarBg: '#ffffff',
    sidebarBorder: '#e2e8f0',
  }
};

export const darkTheme = {
  name: 'dark',
  colors: {
    background: '#0b1120',
    backgroundSecondary: '#0f172a',
    card: '#151f32',
    cardBorder: '#1e3a5f30',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#10b981',
    primaryLight: '#10b98120',
    danger: '#ef4444',
    dangerLight: '#ef444420',
    success: '#10b981',
    successLight: '#10b98120',
    warning: '#f59e0b',
    warningLight: '#f59e0b20',
    info: '#3b82f6',
    infoLight: '#3b82f620',
    border: '#1e3a5f30',
    inputBg: '#0b1120',
    sidebarBg: '#0d1320',
    sidebarBorder: '#1e293b',
  }
};

type Theme = typeof darkTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme');
      if (saved) {
        setIsDark(saved === 'dark');
      }
    } catch (e) {
      console.log('Erro ao carregar tema');
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
