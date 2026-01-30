import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web' && screenWidth > 768;

function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const colors = theme.colors;

  const financeItems = [
    { name: 'index', label: 'Overview', icon: 'grid-outline', iconActive: 'grid', badge: null },
    { name: 'transacoes', label: 'Transações', icon: 'wallet-outline', iconActive: 'wallet', badge: null },
    { name: 'assessor', label: 'Assessor IA', icon: 'sparkles-outline', iconActive: 'sparkles', badge: null },
  ];

  const configItems = [
    { name: 'integracoes', label: 'Integrações', icon: 'extension-puzzle-outline', iconActive: 'extension-puzzle', badge: null },
    { name: 'perfil', label: 'Configurações', icon: 'settings-outline', iconActive: 'settings', badge: null },
  ];

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/index';
    return pathname.includes(name);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  const MenuItem = ({ item }: { item: typeof financeItems[0] }) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isActive(item.name) && { backgroundColor: colors.sidebarItemActive, borderLeftWidth: 3, borderLeftColor: colors.sidebarAccent }
      ]}
      onPress={() => router.push(item.name === 'index' ? '/(tabs)' : `/(tabs)/${item.name}`)}
    >
      <Ionicons
        name={isActive(item.name) ? item.iconActive as any : item.icon as any}
        size={20}
        color={isActive(item.name) ? colors.sidebarTextActive : colors.sidebarText}
      />
      <Text style={[
        styles.menuLabel,
        { color: isActive(item.name) ? colors.sidebarTextActive : colors.sidebarText }
      ]}>
        {item.label}
      </Text>
      {item.badge && (
        <View style={[styles.badge, { backgroundColor: colors.sidebarAccent }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.sidebarBg }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcons}>
          <View style={[styles.logoCircle, { backgroundColor: colors.sidebarAccent }]} />
          <View style={[styles.logoCircle, styles.logoCircleSecond, { backgroundColor: colors.accent }]} />
        </View>
        <Text style={styles.logoText}>Nexfy</Text>
      </View>

      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {/* Finance Section */}
        <Text style={[styles.sectionTitle, { color: colors.sidebarText }]}>FINANÇAS</Text>
        <View style={styles.menuSection}>
          {financeItems.map((item) => (
            <MenuItem key={item.name} item={item} />
          ))}
        </View>

        {/* Config Section */}
        <Text style={[styles.sectionTitle, { color: colors.sidebarText, marginTop: 24 }]}>CONFIGURAÇÕES</Text>
        <View style={styles.menuSection}>
          {configItems.map((item) => (
            <MenuItem key={item.name} item={item} />
          ))}
        </View>
      </ScrollView>

      {/* Promo Card */}
      <View style={[styles.promoCard, { backgroundColor: colors.sidebarItemActive, borderColor: colors.sidebarBorder }]}>
        <View style={[styles.promoBadge, { backgroundColor: colors.sidebarAccent }]}>
          <Text style={styles.promoBadgeText}>Novo</Text>
        </View>
        <Text style={[styles.promoTitle, { color: colors.sidebarTextActive }]}>Upload de documentos</Text>
        <Text style={[styles.promoText, { color: colors.sidebarText }]}>
          Importe extratos bancários e organize automaticamente
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.sidebarText} />
        <Text style={[styles.logoutText, { color: colors.sidebarText }]}>Sair</Text>
      </TouchableOpacity>
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
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
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
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessor"
        options={{
          title: 'Assessor',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
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
    width: 260,
    padding: 20,
    paddingTop: 24,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  logoIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  logoCircleSecond: {
    marginLeft: -10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  menuScroll: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
  menuSection: {
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 12,
    borderRadius: 12,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  menuLabel: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  promoCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  promoBadgeText: {
    color: '#0f2132',
    fontSize: 11,
    fontWeight: '700',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  promoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 16,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});
