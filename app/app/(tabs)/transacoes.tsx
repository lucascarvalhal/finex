import { View, Text, StyleSheet } from 'react-native';

export default function Transacoes() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transações</Text>
      <Text style={styles.empty}>Nenhuma transação ainda</Text>
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
    marginBottom: 24,
  },
  empty: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});
