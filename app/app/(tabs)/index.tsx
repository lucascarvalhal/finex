import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Line, Text as SvgText, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
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

interface Resumo {
  receitas: number;
  despesas: number;
  saldo: number;
}

export default function DashboardScreen() {
  const [resumo, setResumo] = useState<Resumo>({ receitas: 0, despesas: 0, saldo: 0 });
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categorias, setCategorias] = useState<{nome: string, valor: number, cor: string}[]>([]);

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
      
      const resResumo = await fetch(`${API_URL}/transactions/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resResumo.ok) setResumo(await resResumo.json());

      const resTrans = await fetch(`${API_URL}/transactions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resTrans.ok) {
        const data = await resTrans.json();
        setTransacoes(data);
        
        const catMap: {[key: string]: number} = {};
        data.filter((t: Transaction) => t.tipo === 'despesa').forEach((t: Transaction) => {
          catMap[t.categoria] = (catMap[t.categoria] || 0) + t.valor;
        });
        
        const catArray = Object.entries(catMap)
          .map(([nome, valor]) => ({ nome, valor, cor: categoriasConfig[nome]?.cor || '#64748b' }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5);
        setCategorias(catArray);
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

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const variacaoPercentual = resumo.despesas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.despesas * 100) : 0;
  const maxCategoria = categorias.length > 0 ? Math.max(...categorias.map(c => c.valor)) : 1;

  // Gráfico de linha suave
  const LineChart = ({ width = 280, height = 120 }) => {
    const dados = [30, 45, 35, 60, 48, 70, 55];
    const labels = ['24', '25', '26', '27', '28', '29', '30'];
    const max = Math.max(...dados);
    const padding = { top: 10, right: 10, bottom: 20, left: 10 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const points = dados.map((d, i) => ({
      x: padding.left + (i / (dados.length - 1)) * graphWidth,
      y: padding.top + graphHeight - (d / max) * graphHeight,
    }));

    // Curva suave
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

  // Gráfico de barras
  const BarChart = ({ width = 200, height = 120 }) => {
    const dados = [40, 65, 45, 80, 55];
    const dias = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri'];
    const max = Math.max(...dados);
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
        {dados.map((d, i) => {
          const barHeight = (d / max) * (height - 30);
          const x = gap + i * (barWidth + gap);
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={height - 25 - barHeight} width={barWidth} height={barHeight} fill={i % 2 === 0 ? "url(#barGrad1)" : "url(#barGrad2)"} rx={6} />
              <SvgText x={x + barWidth/2} y={height - 8} fill="#4a5568" fontSize="9" textAnchor="middle">{dias[i]}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  };

  // Header Component
  const Header = () => (
    <View style={styles.header}>
      {isWeb && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#4a5568" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#4a5568"
          />
        </View>
      )}
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      </View>
    </View>
  );

  // Activity Item
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

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <View style={styles.mainContent}>
          {/* Coluna Principal */}
          <View style={styles.leftColumn}>
            {/* Card Principal */}
            <View style={styles.portfolioCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>My Portfolio</Text>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#4a5568" />
                </TouchableOpacity>
              </View>
              <Text style={styles.portfolioLabel}>Total Balance</Text>
              <View style={styles.portfolioValueRow}>
                <Text style={styles.portfolioValue}>{formatCurrency(resumo.saldo)}</Text>
                <View style={[styles.badge, { backgroundColor: variacaoPercentual >= 0 ? '#10b98120' : '#ef444420' }]}>
                  <Text style={[styles.badgeText, { color: variacaoPercentual >= 0 ? '#10b981' : '#ef4444' }]}>
                    {variacaoPercentual >= 0 ? '+' : ''}{variacaoPercentual.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.portfolioDesc}>Visão geral das suas finanças</Text>
              <TouchableOpacity style={styles.exploreBtn}>
                <Text style={styles.exploreBtnText}>Explore Dashboard</Text>
              </TouchableOpacity>
            </View>

            {/* Analysis Section */}
            <Text style={styles.sectionTitle}>Analysis</Text>
            
            {/* Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: '#10b98120' }]}>
                    <Ionicons name="diamond-outline" size={20} color="#10b981" />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#4a5568" />
                </View>
                <Text style={styles.metricLabel}>Receitas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{(resumo.receitas/1000).toFixed(2)}k</Text>
                  <Text style={styles.metricPeriod}>Este mês</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: '#3b82f620' }]}>
                    <Ionicons name="eye-outline" size={20} color="#3b82f6" />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#4a5568" />
                </View>
                <Text style={styles.metricLabel}>Despesas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{(resumo.despesas/1000).toFixed(2)}k</Text>
                  <Text style={styles.metricPeriod}>Este mês</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Ionicons name="apps-outline" size={20} color="#f59e0b" />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#4a5568" />
                </View>
                <Text style={styles.metricLabel}>Economia</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{resumo.receitas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.receitas * 100).toFixed(0) : 0}%</Text>
                  <Text style={styles.metricPeriod}>Taxa</Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            <Text style={styles.sectionTitle}>Analysis</Text>
            <View style={styles.chartsRow}>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>Customer</Text>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#4a5568" />
                </View>
                <Text style={styles.chartValue}>565</Text>
                <LineChart width={isWeb ? 280 : screenWidth * 0.42} height={100} />
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>Sale Rate</Text>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#4a5568" />
                </View>
                <Text style={[styles.chartValue, { color: '#10b981' }]}>+12,3%</Text>
                <BarChart width={isWeb ? 200 : screenWidth * 0.38} height={100} />
              </View>
            </View>
          </View>

          {/* Coluna Direita - Activity */}
          {isWeb && (
            <View style={styles.rightColumn}>
              {/* Activity */}
              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Activity</Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                {transacoes.length > 0 ? (
                  transacoes.slice(0, 4).map((t, i) => <ActivityItem key={i} transaction={t} />)
                ) : (
                  <Text style={styles.emptyText}>Nenhuma transação</Text>
                )}
              </View>

              {/* Analysis by Category */}
              <View style={styles.categoryCard}>
                <Text style={styles.categoryTitle}>Analysis</Text>
                {categorias.length > 0 ? (
                  categorias.map((cat, i) => (
                    <View key={i} style={styles.categoryItem}>
                      <Text style={styles.categoryValue}>{cat.valor.toLocaleString()}</Text>
                      <Text style={styles.categoryLabel}>{cat.nome}</Text>
                      <View style={styles.categoryBarBg}>
                        <View style={[styles.categoryBar, { width: `${(cat.valor / maxCategoria) * 100}%`, backgroundColor: cat.cor }]} />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Sem categorias</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Mobile Activity Section */}
        {!isWeb && (
          <View style={styles.mobileSection}>
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>Activity</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              {transacoes.slice(0, 4).map((t, i) => <ActivityItem key={i} transaction={t} />)}
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1120' },
  scrollView: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: isWeb ? 16 : 50,
    backgroundColor: '#0b1120',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151f32',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 280,
  },
  searchInput: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151f32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Main Content
  mainContent: {
    flexDirection: isWeb ? 'row' : 'column',
    padding: 24,
    paddingTop: 8,
    gap: 24,
  },
  leftColumn: { flex: isWeb ? 2 : 1 },
  rightColumn: { width: 300 },

  // Portfolio Card
  portfolioCard: {
    backgroundColor: '#151f32',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e3a5f20',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  portfolioTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  portfolioLabel: { color: '#4a5568', fontSize: 13, marginBottom: 4 },
  portfolioValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  portfolioValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  portfolioDesc: { color: '#4a5568', fontSize: 13, marginBottom: 16 },
  exploreBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  exploreBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Section Title
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: {
    flex: 1,
    backgroundColor: '#151f32',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f20',
  },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricLabel: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  metricValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metricValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  metricPeriod: { color: '#10b981', fontSize: 11 },

  // Charts
  chartsRow: { flexDirection: 'row', gap: 12 },
  chartCard: {
    flex: 1,
    backgroundColor: '#151f32',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f20',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartLabel: { color: '#4a5568', fontSize: 12 },
  chartValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },

  // Activity
  activityCard: {
    backgroundColor: '#151f32',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f20',
  },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  activityTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  viewAll: { color: '#10b981', fontSize: 13 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  activityDate: { color: '#4a5568', fontSize: 11, marginTop: 2 },
  activityValue: { fontSize: 14, fontWeight: '600' },

  // Category
  categoryCard: {
    backgroundColor: '#151f32',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f20',
  },
  categoryTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  categoryItem: { marginBottom: 16 },
  categoryValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  categoryLabel: { color: '#4a5568', fontSize: 11, marginBottom: 6 },
  categoryBarBg: { height: 6, backgroundColor: '#0b1120', borderRadius: 3 },
  categoryBar: { height: 6, borderRadius: 3 },

  // Mobile
  mobileSection: { paddingHorizontal: 24 },
  emptyText: { color: '#4a5568', textAlign: 'center', paddingVertical: 20 },
});
