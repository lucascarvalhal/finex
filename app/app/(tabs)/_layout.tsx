import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web' && screenWidth > 768;

function Sidebar() {
  const pathname = usePathname();
  
  const menuItems = [
    { name: 'index', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { name: 'transacoes', label: 'Transações', icon: 'swap-horizontal-outline', iconActive: 'swap-horizontal' },
    { name: 'assessor', label: 'Assessor IA', icon: 'sparkles-outline', iconActive: 'sparkles' },
    { name: 'integracoes', label: 'Integrações', icon: 'apps-outline', iconActive: 'apps' },
    { name: 'perfil', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
  ];

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/index';
    return pathname.includes(name);
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="wallet" size={24} color="#166534" />
        </View>
        <Text style={styles.logoText}>Finex</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.menuItem, isActive(item.name) && styles.menuItemActive]}
            onPress={() => router.push(item.name === 'index' ? '/(tabs)' : `/(tabs)/${item.name}`)}
          >
            <Ionicons
              name={isActive(item.name) ? item.iconActive as any : item.icon as any}
              size={20}
              color={isActive(item.name) ? '#166534' : '#64748b'}
            />
            <Text style={[styles.menuLabel, isActive(item.name) && styles.menuLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Premium Card */}
      <View style={styles.premiumCard}>
        <Text style={styles.premiumTitle}>Finex Pro</Text>
        <Text style={styles.premiumText}>Desbloqueie recursos avançados</Text>
        <TouchableOpacity style={styles.premiumBtn}>
          <Text style={styles.premiumBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <Sidebar />
        <View style={styles.content}>
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
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: '#166534',
        tabBarInactiveTintColor: '#94a3b8',
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1e293b',
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
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="integracoes"
        options={{
          title: 'Integrações',
          tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" size={size} color={color} />,
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
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingLeft: 8,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534',
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
  menuItemActive: {
    backgroundColor: '#dcfce7',
  },
  menuLabel: {
    marginLeft: 14,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#166534',
    fontWeight: '600',
  },
  premiumCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  premiumTitle: {
    color: '#166534',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  premiumText: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  premiumBtn: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
