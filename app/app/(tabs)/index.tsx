import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Line, Text as SvgText, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

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
  moeda: string;
}

interface Resumo {
  receitas: number;
  despesas: number;
  saldo: number;
}

export default function DashboardScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  
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

  const formatCurrency = (value: number, moeda: string = 'BRL') => {
    const symbols: {[key: string]: string} = { BRL: 'R$', USD: '$', EUR: '€' };
    return `${symbols[moeda] || 'R$'} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const variacaoPercentual = resumo.despesas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.despesas * 100) : 0;
  const maxCategoria = categorias.length > 0 ? Math.max(...categorias.map(c => c.valor)) : 1;

  // Gráfico de linha
  const LineChart = ({ width = 280, height = 120 }) => {
    const ultimos7Dias = transacoes
      .slice(0, 50)
      .reduce((acc: {[key: string]: number}, t) => {
        const dia = t.data;
        if (!acc[dia]) acc[dia] = 0;
        acc[dia] += t.tipo === 'receita' ? t.valor : -t.valor;
        return acc;
      }, {});
    
    const dados = Object.values(ultimos7Dias).slice(0, 7).reverse();
    if (dados.length === 0) return null;
    
    const labels = Object.keys(ultimos7Dias).slice(0, 7).reverse().map(d => d.split('-')[2]);
    const max = Math.max(...dados.map(Math.abs), 1);
    const padding = { top: 10, right: 10, bottom: 20, left: 10 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const points = dados.map((d, i) => ({
      x: padding.left + (i / Math.max(dados.length - 1, 1)) * graphWidth,
      y: padding.top + graphHeight / 2 - (d / max) * (graphHeight / 2),
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
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#lineGrad)" />
        <Path d={curve} fill="none" stroke={colors.primary} strokeWidth="2.5" />
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r="4" fill={colors.card} stroke={colors.primary} strokeWidth="2" />
            {labels[i] && <SvgText x={p.x} y={height - 5} fill={colors.textMuted} fontSize="10" textAnchor="middle">{labels[i]}</SvgText>}
          </React.Fragment>
        ))}
      </Svg>
    );
  };

  // Gráfico de barras
  const BarChart = ({ width = 200, height = 120 }) => {
    const gastosPorDia: {[key: string]: number} = {};
    transacoes.filter(t => t.tipo === 'despesa').slice(0, 50).forEach(t => {
      const dia = new Date(t.data).getDay();
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      gastosPorDia[dias[dia]] = (gastosPorDia[dias[dia]] || 0) + t.valor;
    });

    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const dados = dias.map(d => gastosPorDia[d] || 0);
    const max = Math.max(...dados, 1);
    const barWidth = 24;
    const gap = (width - barWidth * 5) / 6;

    return (
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
          <LinearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.info} />
            <Stop offset="100%" stopColor="#1d4ed8" />
          </LinearGradient>
        </Defs>
        {dados.map((d, i) => {
          const barHeight = Math.max((d / max) * (height - 30), 4);
          const x = gap + i * (barWidth + gap);
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={height - 25 - barHeight} width={barWidth} height={barHeight} fill={i % 2 === 0 ? "url(#barGrad1)" : "url(#barGrad2)"} rx={6} />
              <SvgText x={x + barWidth/2} y={height - 8} fill={colors.textMuted} fontSize="9" textAnchor="middle">{dias[i]}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  };

  // Header
  const Header = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      {isWeb && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      )}
      {!isWeb && (
        <View>
          <Text style={[styles.mobileTitle, { color: colors.text }]}>Dashboard</Text>
        </View>
      )}
      <View style={styles.headerRight}>
        <TouchableOpacity style={[styles.headerIcon, { backgroundColor: colors.card }]} onPress={toggleTheme}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#f59e0b' : '#6366f1'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      </View>
    </View>
  );

  // Activity Item
  const ActivityItem = ({ transaction }: { transaction: Transaction }) => (
    <View style={[styles.activityItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.activityIcon, { backgroundColor: transaction.tipo === 'receita' ? colors.successLight : colors.dangerLight }]}>
        <Ionicons name={transaction.tipo === 'receita' ? 'trending-up' : 'trending-down'} size={18} color={transaction.tipo === 'receita' ? colors.success : colors.danger} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityName, { color: colors.text }]}>{transaction.descricao || transaction.categoria}</Text>
        <Text style={[styles.activityDate, { color: colors.textMuted }]}>{transaction.data} • {transaction.moeda}</Text>
      </View>
      <Text style={[styles.activityValue, { color: transaction.tipo === 'receita' ? colors.success : colors.danger }]}>
        {transaction.tipo === 'receita' ? '+' : '-'}{formatCurrency(transaction.valor, transaction.moeda)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.mainContent}>
          {/* Coluna Principal */}
          <View style={styles.leftColumn}>
            {/* Card Principal */}
            <View style={[styles.portfolioCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.portfolioHeader}>
                <Text style={[styles.portfolioTitle, { color: colors.text }]}>Meu Portfólio</Text>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.portfolioLabel, { color: colors.textSecondary }]}>Saldo Total</Text>
              <View style={styles.portfolioValueRow}>
                <Text style={[styles.portfolioValue, { color: colors.text }]}>{formatCurrency(resumo.saldo)}</Text>
                <View style={[styles.badge, { backgroundColor: variacaoPercentual >= 0 ? colors.successLight : colors.dangerLight }]}>
                  <Text style={[styles.badgeText, { color: variacaoPercentual >= 0 ? colors.success : colors.danger }]}>
                    {variacaoPercentual >= 0 ? '+' : ''}{variacaoPercentual.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.portfolioDesc, { color: colors.textMuted }]}>Visão geral das suas finanças</Text>
              <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.exploreBtnText}>Explorar Dashboard</Text>
              </TouchableOpacity>
            </View>

            {/* Analysis Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Análise</Text>
            
            {/* Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="trending-up" size={20} color={colors.success} />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Receitas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(resumo.receitas)}</Text>
                </View>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="trending-down" size={20} color={colors.danger} />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Despesas</Text>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(resumo.despesas)}</Text>
                </View>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="wallet" size={20} color={colors.warning} />
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Economia</Text>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{resumo.receitas > 0 ? ((resumo.receitas - resumo.despesas) / resumo.receitas * 100).toFixed(0) : 0}%</Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Gráficos</Text>
            <View style={styles.chartsRow}>
              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>Evolução</Text>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.chartValue, { color: colors.text }]}>7 dias</Text>
                <LineChart width={isWeb ? 280 : screenWidth * 0.42} height={100} />
              </View>

              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>Gastos por Dia</Text>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.chartValue, { color: colors.success }]}>Semana</Text>
                <BarChart width={isWeb ? 200 : screenWidth * 0.38} height={100} />
              </View>
            </View>
          </View>

          {/* Coluna Direita - Activity */}
          {isWeb && (
            <View style={styles.rightColumn}>
              {/* Activity */}
              <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.activityHeader}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>Atividades</Text>
                  <TouchableOpacity>
                    <Text style={[styles.viewAll, { color: colors.primary }]}>Ver Todas</Text>
                  </TouchableOpacity>
                </View>
                {transacoes.length > 0 ? (
                  transacoes.slice(0, 5).map((t, i) => <ActivityItem key={i} transaction={t} />)
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma transação</Text>
                )}
              </View>

              {/* Categories */}
              <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>Categorias</Text>
                {categorias.length > 0 ? (
                  categorias.map((cat, i) => (
                    <View key={i} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{cat.nome}</Text>
                        <Text style={[styles.categoryValue, { color: colors.textSecondary }]}>{formatCurrency(cat.valor)}</Text>
                      </View>
                      <View style={[styles.categoryBarBg, { backgroundColor: colors.inputBg }]}>
                        <View style={[styles.categoryBar, { width: `${(cat.valor / maxCategoria) * 100}%`, backgroundColor: cat.cor }]} />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem categorias</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Mobile Activity Section */}
        {!isWeb && (
          <View style={styles.mobileSection}>
            <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.activityHeader}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>Atividades</Text>
                <TouchableOpacity>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>Ver Todas</Text>
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: isWeb ? 16 : 50,
  },
  mobileTitle: { fontSize: 24, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 280,
    borderWidth: 1,
  },
  searchInput: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  mainContent: {
    flexDirection: isWeb ? 'row' : 'column',
    padding: 24,
    paddingTop: 8,
    gap: 24,
  },
  leftColumn: { flex: isWeb ? 2 : 1 },
  rightColumn: { width: 300 },

  portfolioCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  portfolioTitle: { fontSize: 20, fontWeight: 'bold' },
  portfolioLabel: { fontSize: 13, marginBottom: 4 },
  portfolioValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  portfolioValue: { fontSize: 32, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  portfolioDesc: { fontSize: 13, marginBottom: 16 },
  exploreBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  exploreBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },

  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricLabel: { fontSize: 12, marginBottom: 4 },
  metricValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metricValue: { fontSize: 18, fontWeight: 'bold' },

  chartsRow: { flexDirection: 'row', gap: 12 },
  chartCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartLabel: { fontSize: 12 },
  chartValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },

  activityCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  activityTitle: { fontSize: 16, fontWeight: '600' },
  viewAll: { fontSize: 13 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: '500' },
  activityDate: { fontSize: 11, marginTop: 2 },
  activityValue: { fontSize: 14, fontWeight: '600' },

  categoryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  categoryTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryName: { fontSize: 14, fontWeight: '500' },
  categoryValue: { fontSize: 14 },
  categoryBarBg: { height: 6, borderRadius: 3 },
  categoryBar: { height: 6, borderRadius: 3 },

  mobileSection: { paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', paddingVertical: 20 },
});
