import { View, Text, StyleSheet } from 'react-native';

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Bem-vindo ao Finex!</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Saldo Total</Text>
        <Text style={styles.cardValue}>R$ 0,00</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
});
