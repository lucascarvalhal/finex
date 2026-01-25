import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';
const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

interface Transaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data: string;
}

interface ContaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  pago: boolean;
  parcela_atual: number;
  parcela_total: number;
  mes_referencia: number;
  ano_referencia: number;
}

interface Meta {
  id: number;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  cor: string;
}

interface Investimento {
  id: number;
  nome: string;
  tipo: string;
  valor_investido: number;
  valor_atual: number;
  ticker: string;
}

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function DashboardScreen() {
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  
  // Modais
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalContaFixa, setModalContaFixa] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalMeta, setModalMeta] = useState(false);
  const [modalInvestimento, setModalInvestimento] = useState(false);
  
  // Forms
  const [formNome, setFormNome] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formCategoria, setFormCategoria] = useState('Geral');
  const [formDia, setFormDia] = useState('1');
  const [formParcelas, setFormParcelas] = useState('1');
  const [formTipo, setFormTipo] = useState('');
  const [formTicker, setFormTicker] = useState('');

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Transações
      const resTrans = await fetch(`${API_URL}/transactions/`, { headers });
      if (resTrans.ok) setTransacoes(await resTrans.json());

      // Contas Fixas
      const resContas = await fetch(`${API_URL}/contas-fixas/?mes=${mesSelecionado + 1}&ano=${anoSelecionado}`, { headers });
      if (resContas.ok) setContasFixas(await resContas.json());

      // Metas
      const resMetas = await fetch(`${API_URL}/metas/`, { headers });
      if (resMetas.ok) setMetas(await resMetas.json());

      // Investimentos
      const resInvest = await fetch(`${API_URL}/investimentos/`, { headers });
      if (resInvest.ok) setInvestimentos(await resInvest.json());
    } catch (error) {
      console.log('Erro ao buscar dados');
    }
  };

  useEffect(() => { fetchData(); }, [mesSelecionado, anoSelecionado]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filtrar transações do mês
  const transacoesMes = useMemo(() => {
    return transacoes.filter(t => {
      const d = new Date(t.data);
      return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
    });
  }, [transacoes, mesSelecionado, anoSelecionado]);

  // Calcular totais
  const entradas = useMemo(() => {
    return transacoesMes.filter(t => t.tipo === 'receita');
  }, [transacoesMes]);

  const gastosVariaveis = useMemo(() => {
    return transacoesMes.filter(t => t.tipo === 'despesa');
  }, [transacoesMes]);

  const totalEntradas = entradas.reduce((sum, t) => sum + t.valor, 0);
  const totalContasFixas = contasFixas.reduce((sum, c) => sum + c.valor, 0);
  const totalGastosVariaveis = gastosVariaveis.reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = totalContasFixas + totalGastosVariaveis;
  const restante = totalEntradas - totalSaidas;
  const totalInvestido = investimentos.reduce((sum, i) => sum + i.valor_atual, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const resetForm = () => {
    setFormNome('');
    setFormValor('');
    setFormCategoria('Geral');
    setFormDia('1');
    setFormParcelas('1');
    setFormTipo('');
    setFormTicker('');
  };

  // Criar Entrada (Receita)
  const handleAddEntrada = async () => {
    if (!formNome || !formValor) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          descricao: formNome,
          valor: parseFloat(formValor),
          tipo: 'receita',
          categoria: formCategoria,
          data: `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-15`
        }),
      });
      if (response.ok) {
        setModalEntrada(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao criar entrada');
    }
  };

  // Criar Conta Fixa
  const handleAddContaFixa = async () => {
    if (!formNome || !formValor) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/contas-fixas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          valor: parseFloat(formValor),
          dia_vencimento: parseInt(formDia),
          categoria: formCategoria,
          mes_referencia: mesSelecionado + 1,
          ano_referencia: anoSelecionado,
          parcela_atual: 1,
          parcela_total: parseInt(formParcelas)
        }),
      });
      if (response.ok) {
        setModalContaFixa(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao criar conta fixa');
    }
  };

  // Toggle Pago
  const handleTogglePago = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/contas-fixas/${id}/toggle-pago`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      console.log('Erro ao atualizar');
    }
  };

  // Criar Gasto Variável
  const handleAddGasto = async () => {
    if (!formNome || !formValor) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          descricao: formNome,
          valor: parseFloat(formValor),
          tipo: 'despesa',
          categoria: formCategoria,
          data: `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(formDia).padStart(2, '0')}`
        }),
      });
      if (response.ok) {
        setModalGasto(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao criar gasto');
    }
  };

  // Criar Meta
  const handleAddMeta = async () => {
    if (!formNome || !formValor) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/metas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          valor_alvo: parseFloat(formValor),
          categoria: formCategoria
        }),
      });
      if (response.ok) {
        setModalMeta(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao criar meta');
    }
  };

  // Criar Investimento
  const handleAddInvestimento = async () => {
    if (!formNome || !formValor || !formTipo) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/investimentos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          tipo: formTipo,
          valor_investido: parseFloat(formValor),
          valor_atual: parseFloat(formValor),
          ticker: formTicker
        }),
      });
      if (response.ok) {
        setModalInvestimento(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao criar investimento');
    }
  };

  // Gráfico Donut
  const DonutChart = ({ disponivel, total }: { disponivel: number; total: number }) => {
    const size = 160;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = total > 0 ? Math.max(0, Math.min(100, (disponivel / total) * 100)) : 0;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutLabel}>Disponível</Text>
          <Text style={[styles.donutValue, { color: disponivel >= 0 ? '#10b981' : '#ef4444' }]}>{formatCurrency(disponivel)}</Text>
        </View>
      </View>
    );
  };

  // Modal genérico
  const FormModal = ({ visible, onClose, title, onSave, children }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          {children}
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Card Header
  const CardHeader = ({ title, onAdd, color = '#166534' }: { title: string; onAdd: () => void; color?: string }) => (
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <Text style={styles.cardHeaderText}>{title}</Text>
      <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet-outline" size={24} color="#166534" />
            <Text style={styles.logoText}>Finex</Text>
          </View>
        </View>

        {/* Navegação por Mês */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthsNav} contentContainerStyle={styles.monthsNavContent}>
          {mesesCurtos.map((mes, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.monthTab, mesSelecionado === index && styles.monthTabActive]}
              onPress={() => setMesSelecionado(index)}
            >
              <Text style={[styles.monthTabText, mesSelecionado === index && styles.monthTabTextActive]}>{mes}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grid Principal */}
        <View style={styles.mainGrid}>
          
          {/* Card Entradas */}
          <View style={styles.card}>
            <CardHeader title="↑ Entradas" onAdd={() => setModalEntrada(true)} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>NOME</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR (R$)</Text>
              </View>
              {entradas.length > 0 ? entradas.slice(0, 5).map((e, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{e.descricao}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#10b981' }]}>{formatCurrency(e.valor)}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhuma entrada</Text>}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalEntradas)}</Text>
              </View>
            </View>
          </View>

          {/* Card Restante para Gastar */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { backgroundColor: '#166534' }]}>
              <Text style={styles.cardHeaderText}>Restante para Gastar</Text>
            </View>
            <View style={[styles.cardBody, { alignItems: 'center', paddingVertical: 20 }]}>
              <DonutChart disponivel={restante} total={totalEntradas} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Entradas →</Text>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>{formatCurrency(totalEntradas)}</Text>
                  <Text style={styles.summaryPercent}>↑ 12%</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Saídas →</Text>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{formatCurrency(totalSaidas)}</Text>
                  <Text style={[styles.summaryPercent, { color: '#ef4444' }]}>↓ 5%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card Contas Fixas */}
          <View style={styles.card}>
            <CardHeader title="📋 Contas Fixas" onAdd={() => setModalContaFixa(true)} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 40 }]}>PAGO</Text>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>NOME</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>PARC.</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR</Text>
              </View>
              {contasFixas.length > 0 ? contasFixas.slice(0, 5).map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <TouchableOpacity style={{ width: 40 }} onPress={() => handleTogglePago(c.id)}>
                    <Ionicons name={c.pago ? "checkbox" : "square-outline"} size={22} color={c.pago ? "#10b981" : "#cbd5e1"} />
                  </TouchableOpacity>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{c.nome}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{c.parcela_atual}/{c.parcela_total}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(c.valor)}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhuma conta fixa</Text>}
            </View>
          </View>

          {/* Card Gastos Variáveis */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="🛒 Gastos Variáveis" onAdd={() => setModalGasto(true)} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>CATEGORIA</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR (R$)</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>DATA</Text>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>OBS</Text>
              </View>
              {gastosVariaveis.length > 0 ? gastosVariaveis.slice(0, 6).map((g, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{g.categoria}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#ef4444' }]}>{formatCurrency(g.valor)}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{new Date(g.data).toLocaleDateString('pt-BR')}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{g.descricao}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhum gasto variável</Text>}
            </View>
          </View>

          {/* Card Investimentos */}
          <View style={styles.card}>
            <CardHeader title="📈 Investimentos" onAdd={() => setModalInvestimento(true)} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>NOME</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR (R$)</Text>
              </View>
              {investimentos.length > 0 ? investimentos.slice(0, 4).map((inv, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{inv.nome}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#3b82f6' }]}>{formatCurrency(inv.valor_atual)}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhum investimento</Text>}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: '#3b82f6' }]}>{formatCurrency(totalInvestido)}</Text>
              </View>
            </View>
          </View>

          {/* Card Metas */}
          <View style={styles.card}>
            <CardHeader title="🎯 Metas Financeiras" onAdd={() => setModalMeta(true)} />
            <View style={styles.cardBody}>
              {metas.length > 0 ? metas.slice(0, 4).map((m, i) => {
                const progresso = m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
                return (
                  <View key={i} style={styles.metaItem}>
                    <Text style={styles.metaName}>{m.nome}</Text>
                    <View style={styles.metaBarBg}>
                      <View style={[styles.metaBar, { width: `${Math.min(progresso, 100)}%`, backgroundColor: m.cor }]} />
                    </View>
                    <Text style={styles.metaPercent}>{progresso.toFixed(0)}%</Text>
                  </View>
                );
              }) : <Text style={styles.emptyText}>Nenhuma meta</Text>}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Modal Entrada */}
      <FormModal visible={modalEntrada} onClose={() => { setModalEntrada(false); resetForm(); }} title="Nova Entrada" onSave={handleAddEntrada}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Salário" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <TextInput style={styles.input} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Conta Fixa */}
      <FormModal visible={modalContaFixa} onClose={() => { setModalContaFixa(false); resetForm(); }} title="Nova Conta Fixa" onSave={handleAddContaFixa}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Aluguel" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <TextInput style={styles.input} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Dia do Vencimento</Text>
        <TextInput style={styles.input} value={formDia} onChangeText={setFormDia} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Parcelas</Text>
        <TextInput style={styles.input} value={formParcelas} onChangeText={setFormParcelas} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Gasto */}
      <FormModal visible={modalGasto} onClose={() => { setModalGasto(false); resetForm(); }} title="Novo Gasto" onSave={handleAddGasto}>
        <Text style={styles.inputLabel}>Descrição</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Supermercado" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <TextInput style={styles.input} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Categoria</Text>
        <TextInput style={styles.input} value={formCategoria} onChangeText={setFormCategoria} placeholder="Alimentação" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Dia</Text>
        <TextInput style={styles.input} value={formDia} onChangeText={setFormDia} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Meta */}
      <FormModal visible={modalMeta} onClose={() => { setModalMeta(false); resetForm(); }} title="Nova Meta" onSave={handleAddMeta}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Viagem" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor Alvo</Text>
        <TextInput style={styles.input} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Investimento */}
      <FormModal visible={modalInvestimento} onClose={() => { setModalInvestimento(false); resetForm(); }} title="Novo Investimento" onSave={handleAddInvestimento}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Tesouro Selic" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Tipo</Text>
        <TextInput style={styles.input} value={formTipo} onChangeText={setFormTipo} placeholder="Renda Fixa, Ações, FII..." placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <TextInput style={styles.input} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Ticker (opcional)</Text>
        <TextInput style={styles.input} value={formTicker} onChangeText={setFormTicker} placeholder="PETR4" placeholderTextColor="#94a3b8" />
      </FormModal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: isWeb ? 20 : 50, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: 'bold', color: '#166534' },

  monthsNav: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  monthsNavContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  monthTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  monthTabActive: { backgroundColor: '#166534' },
  monthTabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  monthTabTextActive: { color: '#fff' },

  mainGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', width: isWeb ? 'calc(33.333% - 12px)' : '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardWide: { width: isWeb ? 'calc(66.666% - 8px)' : '100%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  cardHeaderText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 16 },

  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 8 },
  tableHeaderText: { fontSize: 10, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { fontSize: 13, color: '#334155' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: '#10b981' },

  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  donutLabel: { fontSize: 11, color: '#64748b' },
  donutValue: { fontSize: 20, fontWeight: 'bold' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  summaryPercent: { fontSize: 11, color: '#10b981', marginTop: 2 },

  metaItem: { marginBottom: 16 },
  metaName: { fontSize: 13, color: '#334155', marginBottom: 6 },
  metaBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  metaBar: { height: 8, borderRadius: 4 },
  metaPercent: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#166534', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
