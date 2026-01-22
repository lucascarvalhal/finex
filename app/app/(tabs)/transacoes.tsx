import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { api, Transaction, TransactionCreate } from '../../services/api';

export default function Transacoes() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.log('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!valor || !categoria) {
      alert('Preencha valor e categoria');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newTransaction: TransactionCreate = {
        tipo,
        valor: parseFloat(valor.replace(',', '.')),
        categoria,
        descricao: descricao || undefined,
        data: today,
      };

      await api.createTransaction(newTransaction);
      await loadTransactions();
      closeModal();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteTransaction(id);
      await loadTransactions();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir');
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTipo('despesa');
    setValor('');
    setCategoria('');
    setDescricao('');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const categoriasSugestoes = tipo === 'despesa' 
    ? ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros']
    : ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'];

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>Nenhuma transação ainda</Text>
        ) : (
          transactions.map((t) => (
            <TouchableOpacity 
              key={t.id} 
              style={styles.transactionItem}
              onLongPress={() => {
                if (confirm('Excluir esta transação?')) {
                  handleDelete(t.id);
                }
              }}
            >
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.tipoIndicator,
                  t.tipo === 'receita' ? styles.indicatorReceita : styles.indicatorDespesa
                ]} />
                <View>
                  <Text style={styles.transactionCategoria}>{t.categoria}</Text>
                  <Text style={styles.transactionDescricao}>{t.descricao || '-'}</Text>
                  <Text style={styles.transactionData}>{formatDate(t.data)}</Text>
                </View>
              </View>
              <Text style={[
                styles.transactionValor,
                t.tipo === 'receita' ? styles.valorReceita : styles.valorDespesa
              ]}>
                {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal Adicionar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Transação</Text>

            {/* Tipo */}
            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'receita' && styles.tipoButtonActiveReceita]}
                onPress={() => setTipo('receita')}
              >
                <Text style={[styles.tipoButtonText, tipo === 'receita' && styles.tipoButtonTextActive]}>
                  Receita
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'despesa' && styles.tipoButtonActiveDespesa]}
                onPress={() => setTipo('despesa')}
              >
                <Text style={[styles.tipoButtonText, tipo === 'despesa' && styles.tipoButtonTextActive]}>
                  Despesa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Valor */}
            <TextInput
              style={styles.input}
              placeholder="Valor"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={valor}
              onChangeText={setValor}
            />

            {/* Categoria */}
            <TextInput
              style={styles.input}
              placeholder="Categoria"
              placeholderTextColor="#64748b"
              value={categoria}
              onChangeText={setCategoria}
            />
            
            {/* Sugestões de categoria */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sugestoes}>
              {categoriasSugestoes.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.sugestaoChip}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={styles.sugestaoText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Descrição */}
            <TextInput
              style={styles.input}
              placeholder="Descrição (opcional)"
              placeholderTextColor="#64748b"
              value={descricao}
              onChangeText={setDescricao}
            />

            {/* Botões */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  transactionItem: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tipoIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  indicatorReceita: {
    backgroundColor: '#10b981',
  },
  indicatorDespesa: {
    backgroundColor: '#ef4444',
  },
  transactionCategoria: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDescricao: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  transactionData: {
    fontSize: 12,
    color: '#475569',
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tipoButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  tipoButtonActiveReceita: {
    backgroundColor: '#10b981',
  },
  tipoButtonActiveDespesa: {
    backgroundColor: '#ef4444',
  },
  tipoButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 16,
  },
  tipoButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  sugestoes: {
    marginBottom: 12,
  },
  sugestaoChip: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
  },
  sugestaoText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
