import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Início',
        }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarLabel: 'Transações',
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
        }}
      />
    </Tabs>
  );
}
