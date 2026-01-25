import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';

interface Transaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data: string;
}

// Alert multiplataforma
const showAlert = (title: string, message: string, buttons: { text: string; style?: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    const confirmBtn = buttons.find(b => b.style === 'destructive' || b.text === 'OK' || b.text === 'Excluir');
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    
    if (cancelBtn && confirmBtn) {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmBtn.onPress) {
        confirmBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (confirmBtn?.onPress) confirmBtn.onPress();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

export default function TransacoesScreen() {
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('despesa');
  const [categoria, setCategoria] = useState('Geral');
  const [loading, setLoading] = useState(false);

  const categorias = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Geral'];

  const fetchTransacoes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransacoes(data);
      }
    } catch (error) {
      console.log('Erro ao buscar transações');
    }
  };

  useEffect(() => { fetchTransacoes(); }, []);

  const resetForm = () => {
    setDescricao('');
    setValor('');
    setTipo('despesa');
    setCategoria('Geral');
    setEditingTransaction(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDescricao(transaction.descricao || '');
    setValor(transaction.valor.toString());
    setTipo(transaction.tipo);
    setCategoria(transaction.categoria);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!descricao || !valor) {
      showAlert('Erro', 'Preencha todos os campos', [{ text: 'OK' }]);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const url = editingTransaction
        ? `${API_URL}/transactions/${editingTransaction.id}`
        : `${API_URL}/transactions/`;

      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          descricao,
          valor: parseFloat(valor),
          tipo,
          categoria,
          data: editingTransaction?.data || new Date().toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchTransacoes();
      } else {
        showAlert('Erro', 'Não foi possível salvar', [{ text: 'OK' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Erro de conexão', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (transaction: Transaction) => {
    showAlert(
      'Excluir Transação',
      `Deseja excluir "${transaction.descricao || transaction.categoria}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_URL}/transactions/${transaction.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                fetchTransacoes();
              } else {
                showAlert('Erro', 'Não foi possível excluir', [{ text: 'OK' }]);
              }
            } catch (error) {
              showAlert('Erro', 'Erro de conexão', [{ text: 'OK' }]);
            }
          }
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.item}>
      <TouchableOpacity style={styles.itemContent} onPress={() => openEditModal(item)}>
        <View style={[styles.itemIcon, { backgroundColor: item.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }]}>
          <Ionicons
            name={item.tipo === 'receita' ? 'trending-up' : 'trending-down'}
            size={20}
            color={item.tipo === 'receita' ? '#16a34a' : '#dc2626'}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemDesc}>{item.descricao || item.categoria}</Text>
          <Text style={styles.itemCat}>{item.categoria} • {item.data}</Text>
        </View>
        <Text style={[styles.itemValor, { color: item.tipo === 'receita' ? '#16a34a' : '#dc2626' }]}>
          {item.tipo === 'receita' ? '+' : '-'}{formatCurrency(item.valor)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={18} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transações</Text>
        <Text style={styles.headerSubtitle}>{transacoes.length} registros</Text>
      </View>

      <FlatList
        data={transacoes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>Nenhuma transação</Text>
            <Text style={styles.emptySubtext}>Toque no + para adicionar</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[styles.tipoBtn, tipo === 'despesa' && styles.tipoBtnDespesa]}
                onPress={() => setTipo('despesa')}
              >
                <Ionicons name="trending-down" size={18} color={tipo === 'despesa' ? '#fff' : '#64748b'} />
                <Text style={[styles.tipoText, tipo === 'despesa' && styles.tipoTextActive]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBtn, tipo === 'receita' && styles.tipoBtnReceita]}
                onPress={() => setTipo('receita')}
              >
                <Ionicons name="trending-up" size={18} color={tipo === 'receita' ? '#fff' : '#64748b'} />
                <Text style={[styles.tipoText, tipo === 'receita' && styles.tipoTextActive]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Valor</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>R$</Text>
              <TextInput
                style={styles.inputValor}
                placeholder="0,00"
                placeholderTextColor="#94a3b8"
                value={valor}
                onChangeText={setValor}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor="#94a3b8"
              value={descricao}
              onChangeText={setDescricao}
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoriasContainer}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoriaBtn, categoria === cat && styles.categoriaBtnActive]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={[styles.categoriaBtnText, categoria === cat && styles.categoriaBtnTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>
                {loading ? 'Salvando...' : (editingTransaction ? 'Atualizar' : 'Adicionar')}
              </Text>
            </TouchableOpacity>

            {editingTransaction && (
              <TouchableOpacity
                style={styles.deleteBtnModal}
                onPress={() => { setModalVisible(false); handleDelete(editingTransaction); }}
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Excluir transação</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: Platform.OS === 'web' ? 20 : 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { color: '#1e293b', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  list: { padding: 16 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemInfo: { flex: 1 },
  itemDesc: { color: '#1e293b', fontSize: 15, fontWeight: '500' },
  itemCat: { color: '#64748b', fontSize: 12, marginTop: 4 },
  itemValor: { fontSize: 15, fontWeight: '600' },
  deleteBtn: { padding: 16, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#166534', width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#166534', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#64748b', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#1e293b', fontSize: 20, fontWeight: 'bold' },
  tipoContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  tipoBtnDespesa: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  tipoBtnReceita: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tipoText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  tipoTextActive: { color: '#fff' },
  label: { color: '#64748b', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputPrefix: { color: '#64748b', fontSize: 18, paddingLeft: 16 },
  inputValor: { flex: 1, color: '#1e293b', padding: 16, fontSize: 24, fontWeight: 'bold' },
  input: { backgroundColor: '#f8fafc', color: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  categoriasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoriaBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  categoriaBtnActive: { backgroundColor: '#166534', borderColor: '#166534' },
  categoriaBtnText: { color: '#64748b', fontSize: 13 },
  categoriaBtnTextActive: { color: '#fff', fontWeight: '500' },
  saveBtn: { backgroundColor: '#166534', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtnModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 12 },
  deleteBtnText: { color: '#dc2626', fontSize: 15 },
});
