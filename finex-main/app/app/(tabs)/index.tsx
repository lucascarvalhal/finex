import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G, Rect, Line, Path, Text as SvgText } from 'react-native-svg';
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

const categoriaCores: { [key: string]: string } = {
  'Alimentação': '#ef4444',
  'Transporte': '#f97316',
  'Saúde': '#10b981',
  'Educação': '#3b82f6',
  'Lazer': '#8b5cf6',
  'Moradia': '#ec4899',
  'Outros': '#64748b',
  'Geral': '#6366f1',
};

export default function DashboardScreen() {
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  
  // Filtro de data personalizado
  const [filtroAtivo, setFiltroAtivo] = useState<'mes' | 'periodo'>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modalFiltro, setModalFiltro] = useState(false);
  
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

  // Filtrar transações do mês ou período
  const transacoesFiltradas = useMemo(() => {
    if (filtroAtivo === 'periodo' && dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      return transacoes.filter(t => {
        const d = new Date(t.data);
        return d >= inicio && d <= fim;
      });
    }
    return transacoes.filter(t => {
      const d = new Date(t.data);
      return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
    });
  }, [transacoes, mesSelecionado, anoSelecionado, filtroAtivo, dataInicio, dataFim]);

  // Calcular totais
  const entradas = useMemo(() => {
    return transacoesFiltradas.filter(t => t.tipo === 'receita');
  }, [transacoesFiltradas]);

  const gastosVariaveis = useMemo(() => {
    return transacoesFiltradas.filter(t => t.tipo === 'despesa');
  }, [transacoesFiltradas]);

  const totalEntradas = entradas.reduce((sum, t) => sum + t.valor, 0);
  const totalContasFixas = contasFixas.reduce((sum, c) => sum + c.valor, 0);
  const totalGastosVariaveis = gastosVariaveis.reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = totalContasFixas + totalGastosVariaveis;
  const restante = totalEntradas - totalSaidas;
  const totalInvestido = investimentos.reduce((sum, i) => sum + i.valor_atual, 0);

  // Dados para gráfico de Gastos por Categoria
  const gastosPorCategoria = useMemo(() => {
    const categorias: { [key: string]: number } = {};
    gastosVariaveis.forEach(g => {
      const cat = g.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + g.valor;
    });
    return Object.entries(categorias)
      .map(([nome, valor]) => ({
        nome,
        valor,
        cor: categoriaCores[nome] || '#64748b'
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [gastosVariaveis]);

  // Dados para gráfico de Entradas vs Saídas (últimos 6 meses)
  const dadosMensais = useMemo(() => {
    const resultado = [];
    for (let i = 5; i >= 0; i--) {
      let mes = mesSelecionado - i;
      let ano = anoSelecionado;
      if (mes < 0) {
        mes += 12;
        ano -= 1;
      }
      
      const transacoesMes = transacoes.filter(t => {
        const d = new Date(t.data);
        return d.getMonth() === mes && d.getFullYear() === ano;
      });
      
      const entradas = transacoesMes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
      const saidas = transacoesMes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
      
      resultado.push({
        mes: mesesCurtos[mes],
        entradas,
        saidas,
        saldo: entradas - saidas
      });
    }
    return resultado;
  }, [transacoes, mesSelecionado, anoSelecionado]);

  // Evolução do saldo acumulado
  const evolucaoSaldo = useMemo(() => {
    let saldoAcumulado = 0;
    return dadosMensais.map(d => {
      saldoAcumulado += d.saldo;
      return { ...d, saldoAcumulado };
    });
  }, [dadosMensais]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
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

  const aplicarFiltroPeriodo = () => {
    if (dataInicio && dataFim) {
      setFiltroAtivo('periodo');
      setModalFiltro(false);
    }
  };

  const limparFiltro = () => {
    setFiltroAtivo('mes');
    setDataInicio('');
    setDataFim('');
    setModalFiltro(false);
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

  // Gráfico Donut - Restante para Gastar
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
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutLabel}>Disponível</Text>
          <Text style={[styles.donutValue, { color: disponivel >= 0 ? '#10b981' : '#ef4444' }]}>{formatCurrency(disponivel)}</Text>
        </View>
      </View>
    );
  };

  // Gráfico Donut - Gastos por Categoria
  const CategoryDonutChart = ({ data }: { data: { nome: string; valor: number; cor: string }[] }) => {
    const size = 180;
    const strokeWidth = 25;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const total = data.reduce((sum, d) => sum + d.valor, 0);
    
    if (total === 0) {
      return (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text style={styles.emptyText}>Nenhum gasto registrado</Text>
        </View>
      );
    }

    let accumulatedPercentage = 0;
    
    return (
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {data.map((item, index) => {
              const percentage = (item.valor / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const rotation = (accumulatedPercentage / 100) * 360;
              accumulatedPercentage += percentage;
              
              return (
                <Circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.cor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  rotation={rotation}
                  origin={`${size / 2}, ${size / 2}`}
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutLabel}>Total</Text>
          <Text style={[styles.donutValue, { color: '#ef4444', fontSize: 16 }]}>{formatCurrency(total)}</Text>
        </View>
        
        {/* Legenda */}
        <View style={styles.legendContainer}>
          {data.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.cor }]} />
              <Text style={styles.legendText}>{item.nome}</Text>
              <Text style={styles.legendValue}>{((item.valor / total) * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Gráfico de Barras - Entradas vs Saídas
  const BarChart = ({ data }: { data: { mes: string; entradas: number; saidas: number }[] }) => {
    const width = isWeb ? 380 : screenWidth - 80;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.flatMap(d => [d.entradas, d.saidas]), 1);
    const barWidth = chartWidth / data.length / 2.5;
    const barGap = barWidth * 0.3;

    return (
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <G key={i}>
            <Line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <SvgText
              x={padding.left - 5}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="end"
            >
              {formatCurrencyShort(maxValue * ratio)}
            </SvgText>
          </G>
        ))}
        
        {/* Bars */}
        {data.map((d, i) => {
          const groupX = padding.left + (chartWidth / data.length) * i + (chartWidth / data.length - barWidth * 2 - barGap) / 2;
          const entradaHeight = (d.entradas / maxValue) * chartHeight;
          const saidaHeight = (d.saidas / maxValue) * chartHeight;
          
          return (
            <G key={i}>
              {/* Entrada */}
              <Rect
                x={groupX}
                y={padding.top + chartHeight - entradaHeight}
                width={barWidth}
                height={entradaHeight}
                fill="#10b981"
                rx={4}
              />
              {/* Saída */}
              <Rect
                x={groupX + barWidth + barGap}
                y={padding.top + chartHeight - saidaHeight}
                width={barWidth}
                height={saidaHeight}
                fill="#ef4444"
                rx={4}
              />
              {/* Label mês */}
              <SvgText
                x={groupX + barWidth + barGap / 2}
                y={height - 10}
                fontSize={11}
                fill="#64748b"
                textAnchor="middle"
              >
                {d.mes}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  // Gráfico de Linha - Evolução do Saldo
  const LineChart = ({ data }: { data: { mes: string; saldoAcumulado: number }[] }) => {
    const width = isWeb ? 380 : screenWidth - 80;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const values = data.map(d => d.saldoAcumulado);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * i;
      const y = padding.top + chartHeight - ((d.saldoAcumulado - minValue) / range) * chartHeight;
      return { x, y, value: d.saldoAcumulado };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Área sob a linha
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    return (
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = minValue + range * ratio;
          return (
            <G key={i}>
              <Line
                x1={padding.left}
                y1={padding.top + chartHeight * (1 - ratio)}
                x2={width - padding.right}
                y2={padding.top + chartHeight * (1 - ratio)}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 5}
                y={padding.top + chartHeight * (1 - ratio) + 4}
                fontSize={10}
                fill="#94a3b8"
                textAnchor="end"
              >
                {formatCurrencyShort(value)}
              </SvgText>
            </G>
          );
        })}
        
        {/* Area fill */}
        <Path d={areaD} fill="rgba(59, 130, 246, 0.1)" />
        
        {/* Line */}
        <Path d={pathD} stroke="#3b82f6" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points */}
        {points.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke="#3b82f6" strokeWidth={2} />
            <SvgText
              x={p.x}
              y={height - 10}
              fontSize={11}
              fill="#64748b"
              textAnchor="middle"
            >
              {data[i].mes}
            </SvgText>
          </G>
        ))}
      </Svg>
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
  const CardHeader = ({ title, onAdd, color = '#166534' }: { title: string; onAdd?: () => void; color?: string }) => (
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <Text style={styles.cardHeaderText}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      )}
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

        {/* Navegação por Mês + Filtro de Período */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthsNav} contentContainerStyle={styles.monthsNavContent}>
            {mesesCurtos.map((mes, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.monthTab, filtroAtivo === 'mes' && mesSelecionado === index && styles.monthTabActive]}
                onPress={() => { setFiltroAtivo('mes'); setMesSelecionado(index); }}
              >
                <Text style={[styles.monthTabText, filtroAtivo === 'mes' && mesSelecionado === index && styles.monthTabTextActive]}>{mes}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Botão Filtro Período */}
          <TouchableOpacity 
            style={[styles.filterBtn, filtroAtivo === 'periodo' && styles.filterBtnActive]} 
            onPress={() => setModalFiltro(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={filtroAtivo === 'periodo' ? '#fff' : '#64748b'} />
            <Text style={[styles.filterBtnText, filtroAtivo === 'periodo' && styles.filterBtnTextActive]}>
              {filtroAtivo === 'periodo' ? `${dataInicio} - ${dataFim}` : 'Período'}
            </Text>
          </TouchableOpacity>
        </View>

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

          {/* =========== NOVOS GRÁFICOS =========== */}

          {/* Gráfico 1: Gastos por Categoria */}
          <View style={styles.card}>
            <CardHeader title="🍩 Gastos por Categoria" color="#8b5cf6" />
            <View style={[styles.cardBody, { alignItems: 'center' }]}>
              <CategoryDonutChart data={gastosPorCategoria} />
            </View>
          </View>

          {/* Gráfico 2: Entradas vs Saídas (6 meses) */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="📊 Entradas vs Saídas (6 meses)" color="#0891b2" />
            <View style={[styles.cardBody, { alignItems: 'center' }]}>
              <BarChart data={dadosMensais} />
              <View style={styles.chartLegend}>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Entradas</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Saídas</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Gráfico 3: Evolução do Saldo */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="📈 Evolução do Saldo (6 meses)" color="#3b82f6" />
            <View style={[styles.cardBody, { alignItems: 'center' }]}>
              <LineChart data={evolucaoSaldo} />
              <View style={styles.saldoInfo}>
                <Text style={styles.saldoInfoLabel}>Saldo Atual Acumulado:</Text>
                <Text style={[styles.saldoInfoValue, { color: evolucaoSaldo[evolucaoSaldo.length - 1]?.saldoAcumulado >= 0 ? '#10b981' : '#ef4444' }]}>
                  {formatCurrency(evolucaoSaldo[evolucaoSaldo.length - 1]?.saldoAcumulado || 0)}
                </Text>
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

      {/* Modal Filtro de Período */}
      <Modal visible={modalFiltro} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por Período</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Data Início (AAAA-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              value={dataInicio} 
              onChangeText={setDataInicio} 
              placeholder="2026-01-01" 
              placeholderTextColor="#94a3b8" 
            />
            
            <Text style={styles.inputLabel}>Data Fim (AAAA-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              value={dataFim} 
              onChangeText={setDataFim} 
              placeholder="2026-01-31" 
              placeholderTextColor="#94a3b8" 
            />
            
            <View style={styles.filterBtnsRow}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#64748b', marginRight: 8 }]} onPress={limparFiltro}>
                <Text style={styles.saveBtnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={aplicarFiltroPeriodo}>
                <Text style={styles.saveBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  filterContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  monthsNav: { flex: 1 },
  monthsNavContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  monthTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  monthTabActive: { backgroundColor: '#166534' },
  monthTabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  monthTabTextActive: { color: '#fff' },

  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 16, gap: 6 },
  filterBtnActive: { backgroundColor: '#166534' },
  filterBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  filterBtnTextActive: { color: '#fff' },
  filterBtnsRow: { flexDirection: 'row', marginTop: 20 },

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

  legendContainer: { marginTop: 16, width: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { flex: 1, fontSize: 12, color: '#64748b' },
  legendValue: { fontSize: 12, fontWeight: '600', color: '#334155' },

  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center' },

  saldoInfo: { marginTop: 16, alignItems: 'center' },
  saldoInfoLabel: { fontSize: 12, color: '#64748b' },
  saldoInfoValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },

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
