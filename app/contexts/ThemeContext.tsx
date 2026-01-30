import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tema claro inspirado nas imagens de referência (mint green/seafoam)
export const lightTheme = {
  name: 'light',
  colors: {
    // Backgrounds
    background: '#f0f7f4',           // Off-white com leve tom verde
    backgroundSecondary: '#e8f5f0',  // Variação mais verde
    contentBg: '#f5faf8',            // Área de conteúdo principal

    // Cards - Inspirado no gradiente mint green das imagens
    card: '#ffffff',
    cardGradientStart: '#4fd1a5',    // Verde menta
    cardGradientEnd: '#8ee8c4',      // Verde menta claro
    cardBorder: '#d1e8df',
    cardShadow: 'rgba(79, 209, 165, 0.15)',

    // Textos
    text: '#0f1f1a',                 // Quase preto com tom verde
    textSecondary: '#4a6359',
    textMuted: '#7a9489',

    // Cores principais - Verde menta/seafoam
    primary: '#4fd1a5',              // Verde menta principal
    primaryDark: '#3bb890',          // Verde menta escuro
    primaryLight: '#4fd1a520',
    accent: '#8ee8c4',               // Verde menta claro
    accentLight: '#8ee8c420',

    // Estados
    danger: '#e54d4d',
    dangerLight: '#fef2f2',
    success: '#4fd1a5',
    successLight: '#e8f8f2',
    warning: '#f5a623',
    warningLight: '#fef9e7',
    info: '#4da6e5',
    infoLight: '#eef7fd',

    // Inputs e bordas
    border: '#d1e8df',
    inputBg: '#f5faf8',
    inputBorder: '#b8d4c8',

    // Sidebar - Escuro como nas imagens
    sidebarBg: '#0a1a1f',            // Azul-petróleo muito escuro
    sidebarText: '#8aab9e',
    sidebarTextActive: '#ffffff',
    sidebarBorder: '#1a3530',
    sidebarItemActive: '#143028',
    sidebarAccent: '#4fd1a5',

    // Gráficos
    chartGradientStart: '#4fd1a5',
    chartGradientEnd: '#4fd1a510',
    chartLine: '#4fd1a5',
    chartGrid: '#d1e8df',

    // Categorias (cores para ícones)
    categoryFood: '#f5a623',
    categoryShopping: '#9b7ed9',
    categoryBills: '#4da6e5',
    categoryCharity: '#e56b9a',
    categoryReward: '#e5c94d',
    categoryInvestment: '#4fd1a5',
  }
};

// Tema escuro - Fundo preto puro como solicitado
export const darkTheme = {
  name: 'dark',
  colors: {
    // Backgrounds - Preto puro
    background: '#000000',           // Preto puro
    backgroundSecondary: '#0a0a0a',  // Quase preto
    contentBg: '#050505',            // Preto suave

    // Cards
    card: '#111111',                 // Cinza muito escuro
    cardGradientStart: '#4fd1a5',    // Verde menta
    cardGradientEnd: '#8ee8c4',      // Verde menta claro
    cardBorder: '#1f1f1f',
    cardShadow: 'rgba(0, 0, 0, 0.5)',

    // Textos
    text: '#f5f5f5',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',

    // Cores principais - Verde menta/seafoam (mesmo do light)
    primary: '#4fd1a5',
    primaryDark: '#3bb890',
    primaryLight: '#4fd1a525',
    accent: '#8ee8c4',
    accentLight: '#8ee8c420',

    // Estados
    danger: '#ff6b6b',
    dangerLight: '#2a1515',
    success: '#4fd1a5',
    successLight: '#0f2a22',
    warning: '#ffb84d',
    warningLight: '#2a2010',
    info: '#6bb8ff',
    infoLight: '#10202a',

    // Inputs e bordas
    border: '#1f1f1f',
    inputBg: '#111111',
    inputBorder: '#2a2a2a',

    // Sidebar - Preto
    sidebarBg: '#000000',            // Preto puro
    sidebarText: '#808080',
    sidebarTextActive: '#ffffff',
    sidebarBorder: '#1a1a1a',
    sidebarItemActive: '#0f1f1a',
    sidebarAccent: '#4fd1a5',

    // Gráficos
    chartGradientStart: '#4fd1a5',
    chartGradientEnd: '#4fd1a510',
    chartLine: '#4fd1a5',
    chartGrid: '#1f1f1f',

    // Categorias
    categoryFood: '#ffb84d',
    categoryShopping: '#b39ddb',
    categoryBills: '#6bb8ff',
    categoryCharity: '#ff8fab',
    categoryReward: '#ffe066',
    categoryInvestment: '#4fd1a5',
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
  const [isDark, setIsDark] = useState(true); // Começar com tema escuro como padrão

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
