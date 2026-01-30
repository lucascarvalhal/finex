import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = 'http://localhost:8000';
const isWeb = Platform.OS === 'web';

interface Transaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data: string;
  moeda?: string;
}

// Moedas disponíveis
const MOEDAS = [
  { codigo: 'BRL', simbolo: 'R$', nome: 'Real', locale: 'pt-BR', decimais: 2, bandeira: '🇧🇷' },
  { codigo: 'USD', simbolo: '$', nome: 'Dólar', locale: 'en-US', decimais: 2, bandeira: '🇺🇸' },
  { codigo: 'EUR', simbolo: '€', nome: 'Euro', locale: 'de-DE', decimais: 2, bandeira: '🇪🇺' },
  { codigo: 'GBP', simbolo: '£', nome: 'Libra', locale: 'en-GB', decimais: 2, bandeira: '🇬🇧' },
  { codigo: 'JPY', simbolo: '¥', nome: 'Iene', locale: 'ja-JP', decimais: 0, bandeira: '🇯🇵' },
];

const CATEGORIAS = {
  'Alimentação': { cor: '#f97316', icon: 'restaurant' },
  'Transporte': { cor: '#8b5cf6', icon: 'car' },
  'Moradia': { cor: '#06b6d4', icon: 'home' },
  'Lazer': { cor: '#ec4899', icon: 'game-controller' },
  'Saúde': { cor: '#10b981', icon: 'medkit' },
  'Educação': { cor: '#3b82f6', icon: 'school' },
  'Serviços': { cor: '#f59e0b', icon: 'construct' },
  'Geral': { cor: '#64748b', icon: 'ellipsis-horizontal' },
};

// Alert multiplataforma
const showAlert = (title: string, message: string, buttons: { text: string; style?: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    const confirmBtn = buttons.find(b => b.style === 'destructive' || b.text === 'OK' || b.text === 'Excluir');
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    if (cancelBtn && confirmBtn) {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmBtn.onPress) confirmBtn.onPress();
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
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;

  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [valorNumerico, setValorNumerico] = useState(0);
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');
  const [categoria, setCategoria] = useState('Geral');
  const [moedaSelecionada, setMoedaSelecionada] = useState(MOEDAS[0]);
  const [mostrarSeletorMoeda, setMostrarSeletorMoeda] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtro de moeda para visualização
  const [filtroMoeda, setFiltroMoeda] = useState<string>('TODAS');

  const categorias = Object.keys(CATEGORIAS);

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

  // Calcular saldos por moeda
  const saldosPorMoeda = useMemo(() => {
    const saldos: { [moeda: string]: { receitas: number, despesas: number, saldo: number } } = {};

    transacoes.forEach(t => {
      const moeda = t.moeda || 'BRL';
      if (!saldos[moeda]) {
        saldos[moeda] = { receitas: 0, despesas: 0, saldo: 0 };
      }
      if (t.tipo === 'receita') {
        saldos[moeda].receitas += t.valor;
        saldos[moeda].saldo += t.valor;
      } else {
        saldos[moeda].despesas += t.valor;
        saldos[moeda].saldo -= t.valor;
      }
    });

    return saldos;
  }, [transacoes]);

  // Filtrar transações por moeda
  const transacoesFiltradas = useMemo(() => {
    if (filtroMoeda === 'TODAS') return transacoes;
    return transacoes.filter(t => (t.moeda || 'BRL') === filtroMoeda);
  }, [transacoes, filtroMoeda]);

  // Moedas com transações
  const moedasComTransacoes = useMemo(() => {
    const moedas = new Set(transacoes.map(t => t.moeda || 'BRL'));
    return Array.from(moedas);
  }, [transacoes]);

  // Formatar valor enquanto digita
  const formatarValorInput = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, '');
    if (!apenasNumeros) {
      setValor('');
      setValorNumerico(0);
      return;
    }
    const valorNum = moedaSelecionada.decimais > 0
      ? parseInt(apenasNumeros) / Math.pow(10, moedaSelecionada.decimais)
      : parseInt(apenasNumeros);
    setValorNumerico(valorNum);
    const valorFormatado = valorNum.toLocaleString(moedaSelecionada.locale, {
      minimumFractionDigits: moedaSelecionada.decimais,
      maximumFractionDigits: moedaSelecionada.decimais,
    });
    setValor(`${moedaSelecionada.simbolo} ${valorFormatado}`);
  };

  const resetForm = () => {
    setDescricao('');
    setValor('');
    setValorNumerico(0);
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
    setValorNumerico(transaction.valor);
    const moeda = MOEDAS.find(m => m.codigo === (transaction.moeda || 'BRL')) || MOEDAS[0];
    setMoedaSelecionada(moeda);
    setValor(`${moeda.simbolo} ${transaction.valor.toLocaleString(moeda.locale, {
      minimumFractionDigits: moeda.decimais,
      maximumFractionDigits: moeda.decimais,
    })}`);
    setTipo(transaction.tipo as 'despesa' | 'receita');
    setCategoria(transaction.categoria);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!descricao || valorNumerico <= 0) {
      showAlert('Erro', 'Preencha todos os campos', [{ text: 'OK' }]);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const url = editingTransaction
        ? `${API_URL}/transactions/${editingTransaction.id}`
        : `${API_URL}/transactions/`;

      const response = await fetch(url, {
        method: editingTransaction ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          descricao,
          valor: valorNumerico,
          tipo,
          categoria,
          data: editingTransaction?.data || new Date().toISOString().split('T')[0],
          moeda: moedaSelecionada.codigo
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
              if (response.ok) fetchTransacoes();
              else showAlert('Erro', 'Não foi possível excluir', [{ text: 'OK' }]);
            } catch (error) {
              showAlert('Erro', 'Erro de conexão', [{ text: 'OK' }]);
            }
          }
        },
      ]
    );
  };

  const formatCurrency = (value: number, moedaCodigo: string = 'BRL') => {
    const moeda = MOEDAS.find(m => m.codigo === moedaCodigo) || MOEDAS[0];
    return value.toLocaleString(moeda.locale, { style: 'currency', currency: moeda.codigo });
  };

  const selecionarMoeda = async (moeda: typeof MOEDAS[0]) => {
    setMoedaSelecionada(moeda);
    setMostrarSeletorMoeda(false);
    if (valorNumerico > 0) {
      const valorFormatado = valorNumerico.toLocaleString(moeda.locale, {
        minimumFractionDigits: moeda.decimais,
        maximumFractionDigits: moeda.decimais,
      });
      setValor(`${moeda.simbolo} ${valorFormatado}`);
    }
  };

  const styles = createStyles(colors, isWeb);

  const renderItem = ({ item }: { item: Transaction }) => {
    const catInfo = CATEGORIAS[item.categoria as keyof typeof CATEGORIAS] || CATEGORIAS['Geral'];
    const moeda = MOEDAS.find(m => m.codigo === item.moeda) || MOEDAS[0];

    return (
      <TouchableOpacity style={styles.transactionItem} onPress={() => openEditModal(item)}>
        <View style={[styles.transactionIcon, { backgroundColor: catInfo.cor + '20' }]}>
          <Ionicons name={catInfo.icon as any} size={20} color={catInfo.cor} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.descricao || item.categoria}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionCat}>{item.categoria}</Text>
            <View style={styles.transactionMoedaBadge}>
              <Text style={styles.transactionMoedaText}>{moeda.codigo}</Text>
            </View>
            <Text style={styles.transactionDate}>{item.data}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionValor, { color: item.tipo === 'receita' ? colors.success : colors.danger }]}>
            {item.tipo === 'receita' ? '+' : '-'}{formatCurrency(item.valor, item.moeda || 'BRL')}
          </Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transações</Text>
          <Text style={styles.headerSubtitle}>{transacoes.length} registros em {moedasComTransacoes.length} moeda(s)</Text>
        </View>
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#f59e0b' : '#6366f1'} />
        </TouchableOpacity>
      </View>

      {/* Resumo por Moeda */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
        <View style={styles.currencyCards}>
          {Object.entries(saldosPorMoeda).map(([moedaCodigo, valores]) => {
            const moeda = MOEDAS.find(m => m.codigo === moedaCodigo) || MOEDAS[0];
            const isSelected = filtroMoeda === moedaCodigo;
            return (
              <TouchableOpacity
                key={moedaCodigo}
                style={[styles.currencyCard, isSelected && styles.currencyCardSelected]}
                onPress={() => setFiltroMoeda(isSelected ? 'TODAS' : moedaCodigo)}
              >
                <View style={styles.currencyCardHeader}>
                  <Text style={styles.currencyFlag}>{moeda.bandeira}</Text>
                  <Text style={[styles.currencyCode, isSelected && styles.currencyCodeSelected]}>{moedaCodigo}</Text>
                </View>
                <Text style={[styles.currencyBalance, { color: valores.saldo >= 0 ? colors.success : colors.danger }]}>
                  {formatCurrency(valores.saldo, moedaCodigo)}
                </Text>
                <View style={styles.currencyDetails}>
                  <Text style={styles.currencyDetailText}>
                    <Ionicons name="arrow-up" size={10} color={colors.success} /> {formatCurrency(valores.receitas, moedaCodigo)}
                  </Text>
                  <Text style={styles.currencyDetailText}>
                    <Ionicons name="arrow-down" size={10} color={colors.danger} /> {formatCurrency(valores.despesas, moedaCodigo)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Filtro ativo */}
      {filtroMoeda !== 'TODAS' && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>Mostrando apenas: {filtroMoeda}</Text>
          <TouchableOpacity onPress={() => setFiltroMoeda('TODAS')}>
            <Ionicons name="close-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Transações */}
      <FlatList
        data={transacoesFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma transação</Text>
            <Text style={styles.emptySubtext}>Toque no + para adicionar</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Nova Transação */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tipo */}
              <View style={styles.tipoContainer}>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'despesa' && styles.tipoBtnDespesa]}
                  onPress={() => setTipo('despesa')}
                >
                  <Ionicons name="arrow-down" size={18} color={tipo === 'despesa' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.tipoText, tipo === 'despesa' && styles.tipoTextActive]}>Despesa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'receita' && styles.tipoBtnReceita]}
                  onPress={() => setTipo('receita')}
                >
                  <Ionicons name="arrow-up" size={18} color={tipo === 'receita' ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.tipoText, tipo === 'receita' && styles.tipoTextActive]}>Receita</Text>
                </TouchableOpacity>
              </View>

              {/* Moeda e Valor */}
              <Text style={styles.label}>Moeda e Valor</Text>
              <View style={styles.valorContainer}>
                <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
                  <Text style={styles.moedaFlag}>{moedaSelecionada.bandeira}</Text>
                  <Text style={styles.moedaBtnText}>{moedaSelecionada.codigo}</Text>
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  style={styles.inputValor}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  value={valor}
                  onChangeText={formatarValorInput}
                  keyboardType="numeric"
                />
              </View>

              {/* Descrição */}
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Almoço no restaurante"
                placeholderTextColor={colors.textMuted}
                value={descricao}
                onChangeText={setDescricao}
              />

              {/* Categoria */}
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

              {/* Botão Salvar */}
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
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Excluir transação</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Seletor de Moeda */}
      <Modal visible={mostrarSeletorMoeda} transparent animationType="fade">
        <TouchableOpacity style={styles.moedaModalOverlay} activeOpacity={1} onPress={() => setMostrarSeletorMoeda(false)}>
          <View style={styles.moedaModalContent}>
            <Text style={styles.moedaModalTitle}>Selecione a Moeda</Text>
            {MOEDAS.map((moeda) => (
              <TouchableOpacity
                key={moeda.codigo}
                style={[styles.moedaOption, moedaSelecionada.codigo === moeda.codigo && styles.moedaOptionActive]}
                onPress={() => selecionarMoeda(moeda)}
              >
                <Text style={styles.moedaOptionFlag}>{moeda.bandeira}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moedaOptionNome}>{moeda.nome}</Text>
                  <Text style={styles.moedaOptionCodigo}>{moeda.codigo} - {moeda.simbolo}</Text>
                </View>
                {moedaSelecionada.codigo === moeda.codigo && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isWeb: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: isWeb ? 24 : 50,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Currency Cards
  currencyScroll: {
    maxHeight: 150,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  currencyCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    padding: 16,
    minWidth: 160,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  currencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  currencyFlag: {
    fontSize: 20,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  currencyCodeSelected: {
    color: colors.primary,
  },
  currencyBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currencyDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyDetailText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Filter Banner
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
  },
  filterText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },

  // Transaction List
  list: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionCat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionMoedaBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionMoedaText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionValor: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },

  // Empty State
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipoBtnDespesa: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  tipoBtnReceita: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  tipoText: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.textSecondary,
  },
  tipoTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  valorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  moedaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
  moedaFlag: {
    fontSize: 16,
  },
  moedaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputValor: {
    flex: 1,
    backgroundColor: colors.inputBg,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoriaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoriaBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoriaBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoriaBtnTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtnModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 12,
  },
  deleteBtnText: {
    fontSize: 15,
  },

  // Moeda Modal
  moedaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moedaModalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 360,
  },
  moedaModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  moedaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.inputBg,
  },
  moedaOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  moedaOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  moedaOptionNome: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  moedaOptionCodigo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
