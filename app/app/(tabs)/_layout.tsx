import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web' && screenWidth > 768;

// Ícones personalizados
const icons = {
  wallet: require('../../assets/icons/Wallet_64.png'),
  barChart: require('../../assets/icons/Bar_Chart_64.png'),
  coin: require('../../assets/icons/Coin_64.png'),
  calculator: require('../../assets/icons/Calculator_64.png'),
  report: require('../../assets/icons/Financial_Report_64.png'),
};

function Sidebar() {
  const pathname = usePathname();
  
  const menuItems = [
    { name: 'index', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { name: 'transacoes', label: 'Transações', icon: 'swap-horizontal-outline', iconActive: 'swap-horizontal' },
    { name: 'assessor', label: 'Assessor IA', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
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
        <Image source={icons.wallet} style={styles.logoIcon} />
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
        },
        tabBarActiveTintColor: '#166534',
        tabBarInactiveTintColor: '#64748b',
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
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
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
    width: 240,
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
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoText: {
    fontSize: 22,
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
    backgroundColor: '#f0fdf4',
  },
  menuLabel: {
    marginLeft: 14,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#166534',
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
    fontSize: 12,
    marginBottom: 14,
  },
  premiumBtn: {
    backgroundColor: '#166534',
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
    backgroundColor: '#f8fafc',
  },
});
