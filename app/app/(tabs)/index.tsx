import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Text as SvgText, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';
const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web' && screenWidth > 768;

interface Transaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data: string;
}

type FilterType = 'day' | 'month' | 'year' | 'all';

export default function DashboardScreen() {
  const [allTransacoes, setAllTransacoes] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [seedingData, setSeedingData] = useState(false);

  const categoriasConfig: {[key: string]: {cor: string}} = {
    'Alimentação': { cor: '#f59e0b' },
    'Transporte': { cor: '#3b82f6' },
    'Moradia': { cor: '#8b5cf6' },
    'Lazer': { cor: '#ec4899' },
    'Saúde': { cor: '#10b981' },
    'Educação': { cor: '#06b6d4' },
    'Geral': { cor: '#64748b' },
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const resTrans = await fetch(`${API_URL}/transactions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resTrans.ok) {
        const data = await resTrans.json();
        setAllTransacoes(data);
      }
    } catch (error) {
      console.log('Erro ao buscar dados');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const transacoes = useMemo(() => {
    if (filterType === 'all') return allTransacoes;
    return allTransacoes.filter(t => {
      const transDate = new Date(t.data);
      const selected = selectedDate;
      switch (filterType) {
        case 'day': return transDate.toDateString() === selected.toDateString();
        case 'month': return transDate.getMonth() === selected.getMonth() && transDate.getFullYear() === selected.getFullYear();
        case 'year': return transDate.getFullYear() === selected.getFullYear();
        default: return true;
      }
    });
  }, [allTransacoes, filterType, selectedDate]);

  const resumo = useMemo(() => {
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [transacoes]);

  const categorias = useMemo(() => {
    const catMap: {[key: string]: number} = {};
    transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
      catMap[t.categoria] = (catMap[t.categoria] || 0) + t.valor;
    });
    return Object.entries(catMap)
      .map(([nome, valor]) => ({ nome, valor, cor: categoriasConfig[nome]?.cor || '#64748b' }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [transacoes]);

  const lineChartData = useMemo(() => {
    const periods: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDate);
      let label = '';
      let periodTransactions: Transaction[] = [];
      if (filterType === 'day' || filterType === 'month') {
        date.setDate(selectedDate.getDate() - i);
        label = date.getDate().toString();
        periodTransactions = allTransacoes.filter(t => new Date(t.data).toDateString() === date.toDateString());
      } else {
        date.setMonth(selectedDate.getMonth() - i);
        label = date.toLocaleString('pt-BR', { month: 'short' }).substring(0, 3);
        periodTransactions = allTransacoes.filter(t => {
          const tDate = new Date(t.data);
          return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
        });
      }
      const receitas = periodTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
      const despesas = periodTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
      periods.push({ label, value: receitas - despesas });
    }
    return periods;
  }, [allTransacoes, selectedDate, filterType]);

  const barChartData = useMemo(() => {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const gastosPorDia = [0, 0, 0, 0, 0, 0, 0];
    transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
      const dayIndex = new Date(t.data).getDay();
      gastosPorDia[dayIndex] += t.valor;
    });
    return weekDays.map((day, index) => ({ day, value: gastosPorDia[index] }));
  }, [transacoes]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const variacaoPercentual = resumo.despesas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.despesas * 100) : 0;
  const taxaEconomia = resumo.receitas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.receitas * 100) : 0;
  const maxCategoria = categorias.length > 0 ? Math.max(...categorias.map(c => c.valor)) : 1;

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (filterType) {
      case 'day': newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); break;
      case 'month': newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); break;
      case 'year': newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1)); break;
    }
    setSelectedDate(newDate);
  };

  const getPeriodLabel = () => {
    switch (filterType) {
      case 'day': return selectedDate.toLocaleDateString('pt-BR');
      case 'month': return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      case 'year': return selectedDate.getFullYear().toString();
      case 'all': return 'Todo período';
    }
  };

  const seedTestData = async () => {
    setSeedingData(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (Platform.OS === 'web') window.alert(result.message);
        fetchData();
      }
    } catch (error) {
      console.log('Erro ao popular dados');
    } finally {
      setSeedingData(false);
    }
  };

  const LineChart = ({ width = 280, height = 120 }) => {
    const dados = lineChartData.map(d => d.value);
    const labels = lineChartData.map(d => d.label);
    const max = Math.max(...dados.map(Math.abs), 1);
    const min = Math.min(...dados, 0);
    const range = max - min || 1;
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    const points = dados.map((d, i) => ({
      x: padding.left + (i / Math.max(dados.length - 1, 1)) * graphWidth,
      y: padding.top + graphHeight - ((d - min) / range) * graphHeight,
    }));
    const curve = points.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = arr[i - 1];
      const cpX = (prev.x + point.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
    }, '');
    const areaPath = `${curve} L ${points[points.length-1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
    return (
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#lineGrad)" />
        <Path d={curve} fill="none" stroke="#10b981" strokeWidth="2.5" />
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r="4" fill="#0d1520" stroke="#10b981" strokeWidth="2" />
            <SvgText x={p.x} y={height - 5} fill="#4a5568" fontSize="10" textAnchor="middle">{labels[i]}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
    );
  };

  const BarChart = ({ width = 200, height = 120 }) => {
    const filteredData = barChartData.filter((_, i) => i >= 1 && i <= 5);
    const max = Math.max(...filteredData.map(d => d.value), 1);
    const barWidth = 24;
    const gap = (width - barWidth * 5) / 6;
    return (
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10b981" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
          <LinearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3b82f6" />
            <Stop offset="100%" stopColor="#1d4ed8" />
          </LinearGradient>
        </Defs>
        {filteredData.map((d, i) => {
          const barHeight = Math.max((d.value / max) * (height - 30), 5);
          const x = gap + i * (barWidth + gap);
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={height - 25 - barHeight} width={barWidth} height={barHeight} fill={i % 2 === 0 ? "url(#barGrad1)" : "url(#barGrad2)"} rx={6} />
              <SvgText x={x + barWidth/2} y={height - 8} fill="#4a5568" fontSize="9" textAnchor="middle">{d.day}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  };

  const FilterBar = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterTabs}>
        {(['day', 'month', 'year', 'all'] as FilterType[]).map((type) => (
          <TouchableOpacity key={type} style={[styles.filterTab, filterType === type && styles.filterTabActive]} onPress={() => setFilterType(type)}>
            <Text style={[styles.filterTabText, filterType === type && styles.filterTabTextActive]}>
              {type === 'day' ? 'Dia' : type === 'month' ? 'Mês' : type === 'year' ? 'Ano' : 'Tudo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {filterType !== 'all' && (
        <View style={styles.periodNavigator}>
          <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.periodBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
          <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.periodBtn}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      {isWeb && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#4a5568" />
          <TextInput style={styles.searchInput} placeholder="Search" placeholderTextColor="#4a5568" />
        </View>
      )}
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon} onPress={seedTestData} disabled={seedingData}>
          <Ionicons name={seedingData ? "hourglass" : "flask"} size={22} color={seedingData ? "#f59e0b" : "#fff"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarText}>C</Text></View>
      </View>
    </View>
  );

  const ActivityItem = ({ transaction }: { transaction: Transaction }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: transaction.tipo === 'receita' ? '#10b98120' : '#3b82f620' }]}>
        <Ionicons name={transaction.tipo === 'receita' ? 'trending-up' : 'trending-down'} size={18} color={transaction.tipo === 'receita' ? '#10b981' : '#3b82f6'} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName}>{transaction.descricao || transaction.categoria}</Text>
        <Text style={styles.activityDate}>{transaction.data}</Text>
      </View>
      <Text style={[styles.activityValue, { color: transaction.tipo === 'receita' ? '#10b981' : '#ef4444' }]}>
        {transaction.tipo === 'receita' ? '+' : '-'}{transaction.valor?.toFixed(2)}
      </Text>
    </View>
  );

  const PlanModal = () => (
    <Modal visible={showPlanModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Escolha seu Plano</Text>
            <TouchableOpacity onPress={() => setShowPlanModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={[styles.planCard, styles.planCardFree]}>
            <View style={styles.planBadge}><Text style={styles.planBadgeText}>Atual</Text></View>
            <Text style={styles.planName}>Free</Text>
            <Text style={styles.planPrice}>R$ 0<Text style={styles.planPeriod}>/mês</Text></Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeature}>✓ Até 50 transações/mês</Text>
              <Text style={styles.planFeature}>✓ Dashboard básico</Text>
              <Text style={styles.planFeature}>✓ 5 consultas ao Assessor IA</Text>
            </View>
          </View>
          <View style={[styles.planCard, styles.planCardPro]}>
            <View style={[styles.planBadge, styles.planBadgePro]}><Text style={styles.planBadgeText}>Popular</Text></View>
            <Text style={styles.planName}>Pro</Text>
            <Text style={styles.planPrice}>R$ 19,90<Text style={styles.planPeriod}>/mês</Text></Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeature}>✓ Transações ilimitadas</Text>
              <Text style={styles.planFeature}>✓ Dashboard avançado</Text>
              <Text style={styles.planFeature}>✓ Assessor IA ilimitado</Text>
              <Text style={styles.planFeature}>✓ Exportar relatórios</Text>
            </View>
            <TouchableOpacity style={styles.planButton}><Text style={styles.planButtonText}>Assinar Pro</Text></TouchableOpacity>
          </View>
          <View style={styles.planCard}>
            <Text style={styles.planName}>Premium</Text>
            <Text style={styles.planPrice}>R$ 39,90<Text style={styles.planPeriod}>/mês</Text></Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeature}>✓ Tudo do Pro + Investimentos</Text>
              <Text style={styles.planFeature}>✓ Múltiplas contas</Text>
            </View>
            <TouchableOpacity style={[styles.planButton, styles.planButtonOutline]}><Text style={[styles.planButtonText, styles.planButtonTextOutline]}>Assinar Premium</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header />
      <FilterBar />
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}>
        <View style={styles.mainContent}>
          <View style={styles.leftColumn}>
            <View style={styles.portfolioCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>My Portfolio</Text>
                <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={20} color="#4a5568" /></TouchableOpacity>
              </View>
              <Text style={styles.portfolioLabel}>Total Balance</Text>
              <View style={styles.portfolioValueRow}>
                <Text style={styles.portfolioValue}>{formatCurrency(resumo.saldo)}</Text>
                <View style={[styles.badge, { backgroundColor: variacaoPercentual >= 0 ? '#10b98120' : '#ef444420' }]}>
                  <Text style={[styles.badgeText, { color: variacaoPercentual >= 0 ? '#10b981' : '#ef4444' }]}>{variacaoPercentual >= 0 ? '+' : ''}{variacaoPercentual.toFixed(1)}%</Text>
                </View>
              </View>
              <Text style={styles.portfolioDesc}>Visão geral das suas finanças</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => setShowPlanModal(true)}><Text style={styles.exploreBtnText}>Explore Dashboard</Text></TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Analysis</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}><View style={[styles.metricIcon, { backgroundColor: '#10b98120' }]}><Ionicons name="diamond-outline" size={20} color="#10b981" /></View></View>
                <Text style={styles.metricLabel}>Receitas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{resumo.receitas >= 1000 ? `${(resumo.receitas/1000).toFixed(1)}k` : resumo.receitas.toFixed(0)}</Text>
                  <Text style={styles.metricPeriod}>Este mês</Text>
                </View>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}><View style={[styles.metricIcon, { backgroundColor: '#3b82f620' }]}><Ionicons name="eye-outline" size={20} color="#3b82f6" /></View></View>
                <Text style={styles.metricLabel}>Despesas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{resumo.despesas >= 1000 ? `${(resumo.despesas/1000).toFixed(1)}k` : resumo.despesas.toFixed(0)}</Text>
                  <Text style={styles.metricPeriod}>Este mês</Text>
                </View>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}><View style={[styles.metricIcon, { backgroundColor: '#f59e0b20' }]}><Ionicons name="apps-outline" size={20} color="#f59e0b" /></View></View>
                <Text style={styles.metricLabel}>Economia</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{taxaEconomia.toFixed(0)}%</Text>
                  <Text style={styles.metricPeriod}>Taxa</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Gráficos</Text>
            <View style={styles.chartsRow}>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}><Text style={styles.chartLabel}>Evolução</Text></View>
                <Text style={styles.chartValue}>{transacoes.length}</Text>
                <LineChart width={isWeb ? 280 : screenWidth * 0.42} height={100} />
              </View>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}><Text style={styles.chartLabel}>Gastos/Dia</Text></View>
                <Text style={[styles.chartValue, { color: taxaEconomia > 0 ? '#10b981' : '#ef4444' }]}>{taxaEconomia > 0 ? '+' : ''}{taxaEconomia.toFixed(1)}%</Text>
                <BarChart width={isWeb ? 200 : screenWidth * 0.38} height={100} />
              </View>
            </View>
          </View>

          {isWeb && (
            <View style={styles.rightColumn}>
              <View style={styles.activityCard}>
                <View style={styles.activityHeader}><Text style={styles.activityTitle}>Activity</Text><Text style={styles.viewAll}>View All</Text></View>
                {transacoes.length > 0 ? transacoes.slice(0, 4).map((t, i) => <ActivityItem key={i} transaction={t} />) : <Text style={styles.emptyText}>Nenhuma transação</Text>}
              </View>
              <View style={styles.categoryCard}>
                <Text style={styles.categoryTitle}>Por Categoria</Text>
                {categorias.length > 0 ? categorias.map((cat, i) => (
                  <View key={i} style={styles.categoryItem}>
                    <Text style={styles.categoryValue}>{formatCurrency(cat.valor).replace('R$', '').trim()}</Text>
                    <Text style={styles.categoryLabel}>{cat.nome}</Text>
                    <View style={styles.categoryBarBg}><View style={[styles.categoryBar, { width: `${(cat.valor / maxCategoria) * 100}%`, backgroundColor: cat.cor }]} /></View>
                  </View>
                )) : <Text style={styles.emptyText}>Sem categorias</Text>}
              </View>
            </View>
          )}
        </View>

        {!isWeb && (
          <View style={styles.mobileSection}>
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}><Text style={styles.activityTitle}>Activity</Text><Text style={styles.viewAll}>View All</Text></View>
              {transacoes.length > 0 ? transacoes.slice(0, 4).map((t, i) => <ActivityItem key={i} transaction={t} />) : <Text style={styles.emptyText}>Nenhuma transação</Text>}
            </View>
            <View style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>Por Categoria</Text>
              {categorias.length > 0 ? categorias.map((cat, i) => (
                <View key={i} style={styles.categoryItem}>
                  <Text style={styles.categoryValue}>{formatCurrency(cat.valor).replace('R$', '').trim()}</Text>
                  <Text style={styles.categoryLabel}>{cat.nome}</Text>
                  <View style={styles.categoryBarBg}><View style={[styles.categoryBar, { width: `${(cat.valor / maxCategoria) * 100}%`, backgroundColor: cat.cor }]} /></View>
                </View>
              )) : <Text style={styles.emptyText}>Sem despesas</Text>}
            </View>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
      <PlanModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1120' },
  scrollView: { flex: 1 },
  filterContainer: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: '#0b1120' },
  filterTabs: { flexDirection: 'row', backgroundColor: '#151f32', borderRadius: 12, padding: 4, marginBottom: 12 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  filterTabActive: { backgroundColor: '#10b981' },
  filterTabText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  filterTabTextActive: { color: '#fff' },
  periodNavigator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  periodBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#151f32', justifyContent: 'center', alignItems: 'center' },
  periodLabel: { color: '#fff', fontSize: 16, fontWeight: '600', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, paddingTop: isWeb ? 16 : 50, backgroundColor: '#0b1120' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151f32', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: 280 },
  searchInput: { color: '#fff', marginLeft: 10, fontSize: 14, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#151f32', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mainContent: { flexDirection: isWeb ? 'row' : 'column', padding: 24, paddingTop: 8, gap: 24 },
  leftColumn: { flex: isWeb ? 2 : 1 },
  rightColumn: { width: 300 },
  portfolioCard: { backgroundColor: '#151f32', borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#1e3a5f20' },
  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  portfolioTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  portfolioLabel: { color: '#4a5568', fontSize: 13, marginBottom: 4 },
  portfolioValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  portfolioValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  portfolioDesc: { color: '#4a5568', fontSize: 13, marginBottom: 16 },
  exploreBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start' },
  exploreBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: '#151f32', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e3a5f20' },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricLabel: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  metricValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metricValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  metricPeriod: { color: '#10b981', fontSize: 11 },
  chartsRow: { flexDirection: 'row', gap: 12 },
  chartCard: { flex: 1, backgroundColor: '#151f32', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e3a5f20' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartLabel: { color: '#4a5568', fontSize: 12 },
  chartValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  activityCard: { backgroundColor: '#151f32', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1e3a5f20' },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  activityTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  viewAll: { color: '#10b981', fontSize: 13 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  activityDate: { color: '#4a5568', fontSize: 11, marginTop: 2 },
  activityValue: { fontSize: 14, fontWeight: '600' },
  categoryCard: { backgroundColor: '#151f32', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1e3a5f20', marginBottom: 16 },
  categoryTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  categoryItem: { marginBottom: 16 },
  categoryValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  categoryLabel: { color: '#4a5568', fontSize: 11, marginBottom: 6 },
  categoryBarBg: { height: 6, backgroundColor: '#0b1120', borderRadius: 3 },
  categoryBar: { height: 6, borderRadius: 3 },
  mobileSection: { paddingHorizontal: 24 },
  emptyText: { color: '#4a5568', textAlign: 'center', paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#151f32', borderRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  planCard: { backgroundColor: '#0b1120', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1e3a5f30', position: 'relative' },
  planCardFree: { borderColor: '#64748b50' },
  planCardPro: { borderColor: '#10b981', borderWidth: 2 },
  planBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: '#64748b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  planBadgePro: { backgroundColor: '#10b981' },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  planName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  planPrice: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  planPeriod: { fontSize: 14, color: '#64748b', fontWeight: 'normal' },
  planFeatures: { marginBottom: 16 },
  planFeature: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  planButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  planButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#10b981' },
  planButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  planButtonTextOutline: { color: '#10b981' },
});
