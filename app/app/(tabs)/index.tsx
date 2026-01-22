import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api, Summary, Transaction } from '../../services/api';

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary>({ receitas: 0, despesas: 0, saldo: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, transactionsData] = await Promise.all([
        api.getSummary(),
        api.getTransactions()
      ]);
      setSummary(summaryData);
      setTransactions(transactionsData.slice(0, 5)); // Últimas 5
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Bem-vindo ao Finex!</Text>

      {/* Saldo */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Saldo Total</Text>
        <Text style={[styles.cardValue, summary.saldo < 0 && styles.negative]}>
          {formatCurrency(summary.saldo)}
        </Text>
      </View>

      {/* Receitas e Despesas */}
      <View style={styles.row}>
        <View style={[styles.cardSmall, styles.cardReceita]}>
          <Text style={styles.cardLabelSmall}>Receitas</Text>
          <Text style={styles.cardValueReceita}>{formatCurrency(summary.receitas)}</Text>
        </View>
        <View style={[styles.cardSmall, styles.cardDespesa]}>
          <Text style={styles.cardLabelSmall}>Despesas</Text>
          <Text style={styles.cardValueDespesa}>{formatCurrency(summary.despesas)}</Text>
        </View>
      </View>

      {/* Últimas Transações */}
      <Text style={styles.sectionTitle}>Últimas Transações</Text>
      {transactions.length === 0 ? (
        <Text style={styles.empty}>Nenhuma transação ainda</Text>
      ) : (
        transactions.map((t) => (
          <View key={t.id} style={styles.transactionItem}>
            <View>
              <Text style={styles.transactionCategoria}>{t.categoria}</Text>
              <Text style={styles.transactionDescricao}>{t.descricao || '-'}</Text>
            </View>
            <Text style={[
              styles.transactionValor,
              t.tipo === 'receita' ? styles.valorReceita : styles.valorDespesa
            ]}>
              {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  loading: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
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
    marginBottom: 16,
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
  negative: {
    color: '#ef4444',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cardSmall: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  cardReceita: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardDespesa: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cardLabelSmall: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  cardValueReceita: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  cardValueDespesa: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
  transactionItem: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionCategoria: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDescricao: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  valorReceita: {
    color: '#10b981',
  },
  valorDespesa: {
    color: '#ef4444',
  },
});
