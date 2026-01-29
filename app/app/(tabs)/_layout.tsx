import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web' && screenWidth > 768;

function Sidebar() {
  const pathname = usePathname();
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;

  const menuItems = [
    { name: 'index', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { name: 'transacoes', label: 'Transações', icon: 'swap-horizontal-outline', iconActive: 'swap-horizontal' },
    { name: 'assessor', label: 'Assessor IA', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
    { name: 'integracoes', label: 'Integrações', icon: 'extension-puzzle-outline', iconActive: 'extension-puzzle' },
    { name: 'perfil', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
  ];

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/index';
    return pathname.includes(name);
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.sidebarBg, borderRightColor: colors.sidebarBorder }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="wallet" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.logoText, { color: colors.text }]}>Nexfy</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.menuItem, 
              { backgroundColor: isActive(item.name) ? colors.primaryLight : 'transparent' }
            ]}
            onPress={() => router.push(item.name === 'index' ? '/(tabs)' : `/(tabs)/${item.name}`)}
          >
            <Ionicons
              name={isActive(item.name) ? item.iconActive as any : item.icon as any}
              size={20}
              color={isActive(item.name) ? colors.primary : colors.textMuted}
            />
            <Text style={[
              styles.menuLabel, 
              { color: isActive(item.name) ? colors.primary : colors.textMuted }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme Toggle */}
      <TouchableOpacity 
        style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={toggleTheme}
      >
        <Ionicons 
          name={isDark ? 'sunny' : 'moon'} 
          size={20} 
          color={isDark ? '#f59e0b' : '#6366f1'} 
        />
        <Text style={[styles.themeText, { color: colors.textSecondary }]}>
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </Text>
      </TouchableOpacity>

      {/* Premium Card */}
      <View style={[styles.premiumCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
        <Text style={[styles.premiumTitle, { color: colors.primary }]}>Nexfy Pro</Text>
        <Text style={[styles.premiumText, { color: colors.textMuted }]}>Desbloqueie recursos avançados</Text>
        <TouchableOpacity style={[styles.premiumBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.premiumBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (isWeb) {
    return (
      <View style={[styles.webContainer, { backgroundColor: colors.background }]}>
        <Sidebar />
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
            }}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="transacoes" />
            <Tabs.Screen name="assessor" />
            <Tabs.Screen name="integracoes" />
            <Tabs.Screen name="perfil" />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessor"
        options={{
          title: 'Assessor',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="integracoes"
        options={{
          title: 'Integrações',
          tabBarIcon: ({ color, size }) => <Ionicons name="extension-puzzle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingLeft: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  menu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLabel: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 10,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  premiumCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  premiumText: {
    fontSize: 12,
    marginBottom: 14,
  },
  premiumBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
});
