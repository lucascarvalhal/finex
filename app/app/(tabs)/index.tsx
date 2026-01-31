import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

// Meses em português
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

import { API_URL } from '../../config/api';
const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Moedas disponíveis
const MOEDAS = [
  { codigo: 'BRL', simbolo: 'R$', nome: 'Real Brasileiro', locale: 'pt-BR', decimais: 2, bandeira: '🇧🇷' },
  { codigo: 'USD', simbolo: '$', nome: 'Dólar Americano', locale: 'en-US', decimais: 2, bandeira: '🇺🇸' },
  { codigo: 'EUR', simbolo: '€', nome: 'Euro', locale: 'de-DE', decimais: 2, bandeira: '🇪🇺' },
  { codigo: 'GBP', simbolo: '£', nome: 'Libra Esterlina', locale: 'en-GB', decimais: 2, bandeira: '🇬🇧' },
  { codigo: 'JPY', simbolo: '¥', nome: 'Iene Japonês', locale: 'ja-JP', decimais: 0, bandeira: '🇯🇵' },
];

// Modos de visualização de moeda
type ModoMoeda = 'MISTO' | 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY';

const MODOS_MOEDA = [
  { codigo: 'MISTO', nome: 'Moedas Mistas', icone: 'layers-outline' },
  { codigo: 'BRL', nome: 'Tudo em Real', bandeira: '🇧🇷' },
  { codigo: 'USD', nome: 'Tudo em Dólar', bandeira: '🇺🇸' },
  { codigo: 'EUR', nome: 'Tudo em Euro', bandeira: '🇪🇺' },
  { codigo: 'GBP', nome: 'Tudo em Libra', bandeira: '🇬🇧' },
  { codigo: 'JPY', nome: 'Tudo em Iene', bandeira: '🇯🇵' },
];

// Categorias com cores e ícones
const CATEGORIAS = {
  'Alimentação': { cor: '#f97316', icon: 'restaurant' },
  'Transporte': { cor: '#8b5cf6', icon: 'car' },
  'Moradia': { cor: '#06b6d4', icon: 'home' },
  'Lazer': { cor: '#ec4899', icon: 'game-controller' },
  'Saúde': { cor: '#10b981', icon: 'medkit' },
  'Educação': { cor: '#3b82f6', icon: 'school' },
  'Serviços': { cor: '#f59e0b', icon: 'construct' },
  'Assinaturas': { cor: '#a855f7', icon: 'card' },
  'Vestuário': { cor: '#14b8a6', icon: 'shirt' },
  'Outros': { cor: '#64748b', icon: 'ellipsis-horizontal' },
};

interface Transaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data: string;
  moeda?: string;
}

interface ContaFixa {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  pago: boolean;
  mes_referencia: number;
  ano_referencia: number;
  moeda?: string;
}

// Componente de Gráfico de Área
const AreaChart = ({ data, colors, width, height }: { data: number[], colors: any, width: number, height: number }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data, 1);
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((value, index) => ({
    x: padding.left + (index / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - (value / maxValue) * chartHeight
  }));

  // Criar path para área
  let pathD = `M ${points[0].x} ${padding.top + chartHeight}`;
  pathD += ` L ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
    const cp1y = points[i - 1].y;
    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
    const cp2y = points[i].y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
  }

  pathD += ` L ${points[points.length - 1].x} ${padding.top + chartHeight}`;
  pathD += ' Z';

  // Criar path para linha
  let lineD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
    const cp1y = points[i - 1].y;
    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
    const cp2y = points[i].y;
    lineD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
  }

  const weeks = ['1', '2', '3', '4', '5', '6', '7'];
  const yLabels = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.chartGradientStart} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={colors.chartGradientEnd} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {yLabels.map((_, i) => (
        <Line
          key={i}
          x1={padding.left}
          y1={padding.top + (i / 4) * chartHeight}
          x2={width - padding.right}
          y2={padding.top + (i / 4) * chartHeight}
          stroke={colors.chartGrid}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Y axis labels */}
      {yLabels.reverse().map((label, i) => (
        <SvgText
          key={i}
          x={padding.left - 10}
          y={padding.top + (i / 4) * chartHeight + 4}
          fill={colors.textMuted}
          fontSize="10"
          textAnchor="end"
        >
          {label >= 1000 ? `${(label / 1000).toFixed(0)}K` : label.toFixed(0)}
        </SvgText>
      ))}

      {/* X axis labels */}
      {weeks.slice(0, data.length).map((week, i) => (
        <SvgText
          key={i}
          x={padding.left + (i / (data.length - 1)) * chartWidth}
          y={height - 10}
          fill={colors.textMuted}
          fontSize="10"
          textAnchor="middle"
        >
          {week}
        </SvgText>
      ))}

      {/* Area fill */}
      <Path d={pathD} fill="url(#areaGradient)" />

      {/* Line */}
      <Path d={lineD} fill="none" stroke={colors.chartLine} strokeWidth="2.5" />

      {/* Data points */}
      {points.map((point, i) => (
        <Circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={colors.card}
          stroke={colors.chartLine}
          strokeWidth="2"
        />
      ))}

      {/* Tooltip for last point */}
      {points.length > 0 && (
        <>
          <Circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="6"
            fill={colors.chartLine}
          />
        </>
      )}
    </Svg>
  );
};

// Componente de Gráfico Donut (Pizza)
const DonutChart = ({
  data,
  colors,
  size = 200,
  strokeWidth = 30
}: {
  data: { label: string; value: number; color: string }[],
  colors: any,
  size?: number,
  strokeWidth?: number
}) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentAngle = -90; // Começar do topo

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {data.map((item, index) => {
          const percentage = item.value / total;
          const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
          const rotation = currentAngle;
          currentAngle += percentage * 360;

          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${center} ${center})`}
            />
          );
        })}
        {/* Centro do donut */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2 - 5}
          fill={colors.card}
        />
      </Svg>
      {/* Valor central */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
          {data.length}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>Categorias</Text>
      </View>
    </View>
  );
};

// Componente de Gráfico de Barras Vertical
const BarChart = ({
  data,
  colors,
  width,
  height,
  labels
}: {
  data: { receitas: number; despesas: number }[],
  colors: any,
  width: number,
  height: number,
  labels: string[]
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.flatMap(d => [d.receitas, d.despesas]), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barGroupWidth = chartWidth / data.length;
  const barWidth = barGroupWidth * 0.35;
  const gap = barGroupWidth * 0.1;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="receitaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
        </LinearGradient>
        <LinearGradient id="despesaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.danger} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.danger} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <G key={i}>
          <Line
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={width - padding.right}
            y2={padding.top + chartHeight * (1 - ratio)}
            stroke={colors.chartGrid}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <SvgText
            x={padding.left - 10}
            y={padding.top + chartHeight * (1 - ratio) + 4}
            fill={colors.textMuted}
            fontSize="10"
            textAnchor="end"
          >
            {maxValue * ratio >= 1000 ? `${((maxValue * ratio) / 1000).toFixed(0)}K` : (maxValue * ratio).toFixed(0)}
          </SvgText>
        </G>
      ))}

      {/* Barras */}
      {data.map((item, index) => {
        const x = padding.left + index * barGroupWidth + gap;
        const receitaHeight = (item.receitas / maxValue) * chartHeight;
        const despesaHeight = (item.despesas / maxValue) * chartHeight;

        return (
          <G key={index}>
            {/* Barra de Receita */}
            <Rect
              x={x}
              y={padding.top + chartHeight - receitaHeight}
              width={barWidth}
              height={receitaHeight}
              fill="url(#receitaGradient)"
              rx={4}
            />
            {/* Barra de Despesa */}
            <Rect
              x={x + barWidth + gap / 2}
              y={padding.top + chartHeight - despesaHeight}
              width={barWidth}
              height={despesaHeight}
              fill="url(#despesaGradient)"
              rx={4}
            />
            {/* Label */}
            <SvgText
              x={x + barWidth + gap / 4}
              y={height - 15}
              fill={colors.textMuted}
              fontSize="10"
              textAnchor="middle"
            >
              {labels[index] || ''}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

// Componente de Barras Horizontais (Ranking)
const HorizontalBarChart = ({
  data,
  colors,
  maxWidth = 200
}: {
  data: { label: string; value: number; color: string; icon?: string }[],
  colors: any,
  maxWidth?: number
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={{ gap: 12 }}>
      {data.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: item.color + '20',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Ionicons name={item.icon as any || 'ellipsis-horizontal'} size={18} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{item.label}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                {((item.value / maxValue) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={{
              height: 8,
              backgroundColor: colors.border,
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <View style={{
                width: `${(item.value / maxValue) * 100}%`,
                height: '100%',
                backgroundColor: item.color,
                borderRadius: 4
              }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// Componente Mini Sparkline
const Sparkline = ({
  data,
  color,
  width = 80,
  height = 30
}: {
  data: number[],
  color: string,
  width?: number,
  height?: number
}) => {
  if (!data || data.length < 2) return null;

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - minValue) / range) * height
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  return (
    <Svg width={width} height={height}>
      <Path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
    </Svg>
  );
};

// Componente Gauge/Velocímetro
const GaugeChart = ({
  value,
  maxValue,
  colors,
  size = 120,
  label
}: {
  value: number,
  maxValue: number,
  colors: any,
  size?: number,
  label: string
}) => {
  const percentage = Math.min(value / maxValue, 1);
  const radius = size / 2 - 15;
  const circumference = Math.PI * radius; // Meio círculo
  const strokeDasharray = `${circumference * percentage} ${circumference}`;
  const center = size / 2;

  // Cor baseada no percentual
  const getColor = () => {
    if (percentage < 0.5) return colors.success;
    if (percentage < 0.8) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + 20}>
        {/* Background arc */}
        <Path
          d={`M ${15} ${center} A ${radius} ${radius} 0 0 1 ${size - 15} ${center}`}
          fill="none"
          stroke={colors.border}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <Path
          d={`M ${15} ${center} A ${radius} ${radius} 0 0 1 ${size - 15} ${center}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
      </Svg>
      <View style={{ position: 'absolute', bottom: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
          {(percentage * 100).toFixed(0)}%
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;

  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Usuário');

  // Filtros de período
  const [dataInicio, setDataInicio] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês
    return d;
  });
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarioMes, setCalendarioMes] = useState(new Date().getMonth());
  const [calendarioAno, setCalendarioAno] = useState(new Date().getFullYear());
  const [selecionandoInicio, setSelecionandoInicio] = useState(true);

  // Modo de visualização de moeda
  const [modoMoeda, setModoMoeda] = useState<ModoMoeda>('MISTO');
  const [showMoedaSelector, setShowMoedaSelector] = useState(false);

  // Cotações
  const [cotacoes, setCotacoes] = useState<{ [key: string]: number }>({
    BRL: 1, USD: 6.0, EUR: 6.5, GBP: 7.5, JPY: 0.04,
  });

  // Buscar dados
  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [transRes, contasRes, userRes] = await Promise.all([
        fetch(`${API_URL}/transactions/`, { headers }),
        fetch(`${API_URL}/contas-fixas/`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers }),
      ]);

      if (transRes.ok) setTransacoes(await transRes.json());
      if (contasRes.ok) setContasFixas(await contasRes.json());
      if (userRes.ok) {
        const user = await userRes.json();
        setUserName(user.name || 'Usuário');
      }
    } catch (error) {
      console.log('Erro ao buscar dados');
    }
  };

  // Buscar cotações
  useEffect(() => {
    const fetchCotacoes = async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL');
        const data = await response.json();
        setCotacoes({
          BRL: 1,
          USD: parseFloat(data.USDBRL?.bid) || 6.0,
          EUR: parseFloat(data.EURBRL?.bid) || 6.5,
          GBP: parseFloat(data.GBPBRL?.bid) || 7.5,
          JPY: parseFloat(data.JPYBRL?.bid) || 0.04,
        });
      } catch (error) {
        console.log('Usando cotações padrão');
      }
    };
    fetchCotacoes();
    const interval = setInterval(fetchCotacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Transações filtradas por período
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const tDate = new Date(t.data);
      return tDate >= dataInicio && tDate <= dataFim;
    });
  }, [transacoes, dataInicio, dataFim]);

  // Cálculos por moeda (com filtro de período)
  const calcularPorMoeda = useMemo(() => {
    const resultado: { [moeda: string]: { receitas: number, despesas: number, saldo: number } } = {};

    transacoesFiltradas.forEach(t => {
      const moeda = t.moeda || 'BRL';
      if (!resultado[moeda]) {
        resultado[moeda] = { receitas: 0, despesas: 0, saldo: 0 };
      }
      if (t.tipo === 'receita') {
        resultado[moeda].receitas += t.valor;
        resultado[moeda].saldo += t.valor;
      } else {
        resultado[moeda].despesas += t.valor;
        resultado[moeda].saldo -= t.valor;
      }
    });

    return resultado;
  }, [transacoesFiltradas]);

  // Converter valor para moeda destino
  const converterParaMoeda = useCallback((valor: number, moedaOrigem: string, moedaDestino: string) => {
    if (moedaOrigem === moedaDestino) return valor;
    // Primeiro converte para BRL, depois para moeda destino
    const valorEmBRL = valor * (cotacoes[moedaOrigem] || 1);
    return valorEmBRL / (cotacoes[moedaDestino] || 1);
  }, [cotacoes]);

  // Total convertido (baseado no modo de moeda selecionado)
  const totaisConvertidos = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;

    Object.entries(calcularPorMoeda).forEach(([moeda, valores]) => {
      if (modoMoeda === 'MISTO') {
        // Converte tudo para BRL
        const taxa = cotacoes[moeda] || 1;
        totalReceitas += valores.receitas * taxa;
        totalDespesas += valores.despesas * taxa;
      } else {
        // Converte para a moeda selecionada
        totalReceitas += converterParaMoeda(valores.receitas, moeda, moedaDestino);
        totalDespesas += converterParaMoeda(valores.despesas, moeda, moedaDestino);
      }
    });

    return {
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
      moeda: modoMoeda === 'MISTO' ? 'BRL' : modoMoeda
    };
  }, [calcularPorMoeda, cotacoes, modoMoeda, converterParaMoeda]);

  // Dados para gráfico (baseado no período selecionado)
  const chartData = useMemo(() => {
    const weeks: number[] = [];
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;

    // Calcula número de semanas no período
    const diffTime = dataFim.getTime() - dataInicio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const numWeeks = Math.min(7, Math.ceil(diffDays / 7));

    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekEnd = new Date(dataFim);
      weekEnd.setDate(dataFim.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);

      let weekTotal = 0;
      transacoesFiltradas.forEach(t => {
        const tDate = new Date(t.data);
        if (tDate >= weekStart && tDate <= weekEnd) {
          const moedaOrigem = t.moeda || 'BRL';
          if (t.tipo === 'receita') {
            weekTotal += converterParaMoeda(t.valor, moedaOrigem, moedaDestino);
          }
        }
      });
      weeks.push(weekTotal);
    }

    return weeks.length > 0 ? weeks : [0];
  }, [transacoesFiltradas, modoMoeda, dataInicio, dataFim, converterParaMoeda]);

  // Gastos por categoria
  const gastosPorCategoria = useMemo(() => {
    const categorias: { [key: string]: number } = {};
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;

    transacoesFiltradas
      .filter(t => t.tipo === 'despesa')
      .forEach(t => {
        const moedaOrigem = t.moeda || 'BRL';
        const cat = t.categoria || 'Outros';
        categorias[cat] = (categorias[cat] || 0) + converterParaMoeda(t.valor, moedaOrigem, moedaDestino);
      });

    return Object.entries(categorias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [transacoesFiltradas, modoMoeda, converterParaMoeda]);

  // Dados para Donut Chart (categorias)
  const donutData = useMemo(() => {
    return gastosPorCategoria.map(([cat, valor]) => {
      const catInfo = CATEGORIAS[cat as keyof typeof CATEGORIAS] || CATEGORIAS['Outros'];
      return {
        label: cat,
        value: valor,
        color: catInfo.cor
      };
    });
  }, [gastosPorCategoria]);

  // Dados para Bar Chart (receitas vs despesas por mês)
  const barChartData = useMemo(() => {
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;
    const meses: { [key: string]: { receitas: number; despesas: number } } = {};

    // Pegar últimos 6 meses
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${mes.getFullYear()}-${mes.getMonth()}`;
      meses[key] = { receitas: 0, despesas: 0 };
    }

    transacoes.forEach(t => {
      const tDate = new Date(t.data);
      const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
      if (meses[key]) {
        const moedaOrigem = t.moeda || 'BRL';
        const valor = converterParaMoeda(t.valor, moedaOrigem, moedaDestino);
        if (t.tipo === 'receita') {
          meses[key].receitas += valor;
        } else {
          meses[key].despesas += valor;
        }
      }
    });

    return Object.values(meses);
  }, [transacoes, modoMoeda, converterParaMoeda]);

  // Labels para o Bar Chart
  const barChartLabels = useMemo(() => {
    const labels: string[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      labels.push(MESES[mes.getMonth()]);
    }
    return labels;
  }, []);

  // Dados para Horizontal Bar Chart (top transações)
  const topDespesas = useMemo(() => {
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;

    return transacoesFiltradas
      .filter(t => t.tipo === 'despesa')
      .map(t => ({
        label: t.descricao || t.categoria,
        value: converterParaMoeda(t.valor, t.moeda || 'BRL', moedaDestino),
        color: (CATEGORIAS[t.categoria as keyof typeof CATEGORIAS] || CATEGORIAS['Outros']).cor,
        icon: (CATEGORIAS[t.categoria as keyof typeof CATEGORIAS] || CATEGORIAS['Outros']).icon
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transacoesFiltradas, modoMoeda, converterParaMoeda]);

  // Dados para Sparklines (evolução diária)
  const sparklineReceitas = useMemo(() => {
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;
    const dias: number[] = [];
    const hoje = new Date();

    for (let i = 13; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const diaStr = dia.toISOString().split('T')[0];

      let total = 0;
      transacoes.forEach(t => {
        if (t.data === diaStr && t.tipo === 'receita') {
          total += converterParaMoeda(t.valor, t.moeda || 'BRL', moedaDestino);
        }
      });
      dias.push(total);
    }

    return dias;
  }, [transacoes, modoMoeda, converterParaMoeda]);

  const sparklineDespesas = useMemo(() => {
    const moedaDestino = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;
    const dias: number[] = [];
    const hoje = new Date();

    for (let i = 13; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const diaStr = dia.toISOString().split('T')[0];

      let total = 0;
      transacoes.forEach(t => {
        if (t.data === diaStr && t.tipo === 'despesa') {
          total += converterParaMoeda(t.valor, t.moeda || 'BRL', moedaDestino);
        }
      });
      dias.push(total);
    }

    return dias;
  }, [transacoes, modoMoeda, converterParaMoeda]);

  // Gauge - Taxa de economia (receitas - despesas / receitas)
  const taxaEconomia = useMemo(() => {
    if (totaisConvertidos.receitas === 0) return 0;
    const economia = totaisConvertidos.receitas - totaisConvertidos.despesas;
    return Math.max(0, economia / totaisConvertidos.receitas);
  }, [totaisConvertidos]);

  // Gauge - Gastos do orçamento (simulando um orçamento mensal)
  const orcamentoMensal = useMemo(() => {
    // Simular orçamento como 80% das receitas
    const orcamento = totaisConvertidos.receitas * 0.8;
    if (orcamento === 0) return 0;
    return Math.min(totaisConvertidos.despesas / orcamento, 1);
  }, [totaisConvertidos]);

  // Próximas contas a pagar
  const proximasContas = useMemo(() => {
    const hoje = new Date();
    return contasFixas
      .filter(c => !c.pago)
      .sort((a, b) => a.dia_vencimento - b.dia_vencimento)
      .slice(0, 4);
  }, [contasFixas]);

  // Formatar moeda
  const formatCurrency = (value: number, moeda: string = 'BRL') => {
    const m = MOEDAS.find(m => m.codigo === moeda) || MOEDAS[0];
    return value.toLocaleString(m.locale, { style: 'currency', currency: m.codigo });
  };

  // Moeda para exibição (baseado no modo)
  const moedaExibicao = modoMoeda === 'MISTO' ? 'BRL' : modoMoeda;

  // Calcular porcentagem de gastos
  const calcularPorcentagem = (valor: number) => {
    if (totaisConvertidos.despesas === 0) return 0;
    return Math.round((valor / totaisConvertidos.despesas) * 100);
  };

  // Formatar período para exibição
  const formatarPeriodo = () => {
    const inicio = dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const fim = dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${inicio} - ${fim}`;
  };

  // Gerar dias do calendário
  const gerarDiasCalendario = () => {
    const primeiroDia = new Date(calendarioAno, calendarioMes, 1);
    const ultimoDia = new Date(calendarioAno, calendarioMes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();

    const dias: (number | null)[] = [];

    // Dias vazios no início
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null);
    }

    // Dias do mês
    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(i);
    }

    return dias;
  };

  // Selecionar data no calendário
  const selecionarData = (dia: number) => {
    const data = new Date(calendarioAno, calendarioMes, dia);
    if (selecionandoInicio) {
      setDataInicio(data);
      setSelecionandoInicio(false);
    } else {
      if (data >= dataInicio) {
        setDataFim(data);
      } else {
        setDataInicio(data);
        setDataFim(dataInicio);
      }
      setSelecionandoInicio(true);
      setShowCalendar(false);
    }
  };

  // Verificar se data está no range selecionado
  const estaNoRange = (dia: number) => {
    const data = new Date(calendarioAno, calendarioMes, dia);
    return data >= dataInicio && data <= dataFim;
  };

  // Verificar se é data início ou fim
  const eDataInicio = (dia: number) => {
    const data = new Date(calendarioAno, calendarioMes, dia);
    return data.toDateString() === dataInicio.toDateString();
  };

  const eDataFim = (dia: number) => {
    const data = new Date(calendarioAno, calendarioMes, dia);
    return data.toDateString() === dataFim.toDateString();
  };

  // Presets de período
  const aplicarPreset = (preset: string) => {
    const hoje = new Date();
    let inicio = new Date();

    switch (preset) {
      case 'hoje':
        inicio = hoje;
        break;
      case 'semana':
        inicio.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'trimestre':
        inicio.setMonth(hoje.getMonth() - 3);
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        break;
    }

    setDataInicio(inicio);
    setDataFim(hoje);
    setShowCalendar(false);
  };

  const styles = createStyles(colors, isWeb);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Coluna Principal */}
          <View style={styles.mainColumn}>
            {/* Header Overview */}
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <View style={styles.headerControls}>
                {/* Seletor de Período/Calendário */}
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowCalendar(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={styles.datePickerText}>{formatarPeriodo()}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Seletor de Moeda */}
                <TouchableOpacity style={styles.moedaSelectorBtn} onPress={() => setShowMoedaSelector(true)}>
                  {modoMoeda === 'MISTO' ? (
                    <Ionicons name="layers-outline" size={18} color={colors.primary} />
                  ) : (
                    <Text style={styles.moedaFlag}>{MOEDAS.find(m => m.codigo === modoMoeda)?.bandeira}</Text>
                  )}
                  <Text style={styles.moedaSelectorText}>
                    {modoMoeda === 'MISTO' ? 'Misto' : modoMoeda}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Métricas Principais */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Receitas</Text>
                  <Text style={styles.metricMoeda}>{moedaExibicao}</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrency(totaisConvertidos.receitas, moedaExibicao)}</Text>
                <View style={[styles.metricBadge, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="arrow-up" size={12} color={colors.success} />
                  <Text style={[styles.metricChange, { color: colors.success }]}>Entradas</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Despesas</Text>
                  <Text style={styles.metricMoeda}>{moedaExibicao}</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrency(totaisConvertidos.despesas, moedaExibicao)}</Text>
                <View style={[styles.metricBadge, { backgroundColor: colors.dangerLight }]}>
                  <Ionicons name="arrow-down" size={12} color={colors.danger} />
                  <Text style={[styles.metricChange, { color: colors.danger }]}>Saídas</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Saldo</Text>
                  <Text style={styles.metricMoeda}>{moedaExibicao}</Text>
                </View>
                <Text style={[styles.metricValue, { color: totaisConvertidos.saldo >= 0 ? colors.success : colors.danger }]}>
                  {formatCurrency(totaisConvertidos.saldo, moedaExibicao)}
                </Text>
                <View style={[styles.metricBadge, { backgroundColor: totaisConvertidos.saldo >= 0 ? colors.successLight : colors.dangerLight }]}>
                  <Ionicons name={totaisConvertidos.saldo >= 0 ? 'trending-up' : 'trending-down'} size={12} color={totaisConvertidos.saldo >= 0 ? colors.success : colors.danger} />
                  <Text style={[styles.metricChange, { color: totaisConvertidos.saldo >= 0 ? colors.success : colors.danger }]}>Balanço</Text>
                </View>
              </View>
            </View>

            {/* Card Upgrade */}
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeContent}>
                <View style={styles.upgradeTextContainer}>
                  <Text style={styles.upgradeTitle}>Melhore seu plano para uma</Text>
                  <Text style={styles.upgradeHighlight}>Experiência completa</Text>
                  <Text style={styles.upgradeDesc}>Desbloqueie recursos avançados de análise financeira</Text>
                  <TouchableOpacity style={styles.upgradeBtn}>
                    <Ionicons name="lock-open" size={16} color="#0f2132" />
                    <Text style={styles.upgradeBtnText}>Upgrade Agora</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.upgradeIllustration}>
                  <View style={styles.coinStack}>
                    <View style={[styles.coin, { backgroundColor: colors.accent }]} />
                    <View style={[styles.coin, { backgroundColor: colors.primary, marginTop: -15 }]} />
                    <View style={[styles.coin, { backgroundColor: colors.accent, marginTop: -15 }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Gráfico Breakdown */}
            <View style={styles.breakdownCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Breakdown de Receitas</Text>
                  <Text style={styles.chartSubtitle}>Evolução semanal do período selecionado</Text>
                </View>
                <View style={styles.chartBadge}>
                  <Text style={styles.chartBadgeText}>Semanal</Text>
                </View>
              </View>

              <View style={styles.breakdownSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Recebido</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    +{formatCurrency(totaisConvertidos.receitas, moedaExibicao)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Gasto</Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>
                    -{formatCurrency(totaisConvertidos.despesas, moedaExibicao)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Saldo</Text>
                  <Text style={[styles.summaryValue, { color: totaisConvertidos.saldo >= 0 ? colors.success : colors.danger }]}>
                    {formatCurrency(totaisConvertidos.saldo, moedaExibicao)}
                  </Text>
                </View>
              </View>

              <View style={styles.breakdownChartContainer}>
                <AreaChart
                  data={chartData}
                  colors={colors}
                  width={isWeb ? 700 : screenWidth - 60}
                  height={280}
                />
              </View>

              {/* Categorias */}
              <View style={styles.categoriesGrid}>
                {gastosPorCategoria.map(([cat, valor]) => {
                  const catInfo = CATEGORIAS[cat as keyof typeof CATEGORIAS] || CATEGORIAS['Outros'];
                  return (
                    <View key={cat} style={styles.categoryItem}>
                      <View style={[styles.categoryIcon, { backgroundColor: catInfo.cor + '20' }]}>
                        <Ionicons name={catInfo.icon as any} size={18} color={catInfo.cor} />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{cat}</Text>
                        <Text style={styles.categoryValue}>{formatCurrency(valor, moedaExibicao)}</Text>
                      </View>
                      <View style={styles.categoryPercent}>
                        <Text style={styles.categoryPercentText}>{calcularPorcentagem(valor)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Row de Gráficos Secundários */}
            <View style={styles.chartsRow}>
              {/* Gráfico de Barras - Receitas vs Despesas */}
              <View style={[styles.chartCard, styles.chartCardHalf]}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Receitas vs Despesas</Text>
                  <View style={styles.chartBadge}>
                    <Text style={styles.chartBadgeText}>6 meses</Text>
                  </View>
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Receitas</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                    <Text style={styles.legendText}>Despesas</Text>
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={barChartData}
                    colors={colors}
                    width={isWeb ? 320 : screenWidth - 80}
                    height={180}
                    labels={barChartLabels}
                  />
                </View>
              </View>

              {/* Gráfico Donut - Categorias */}
              <View style={[styles.chartCard, styles.chartCardHalf]}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Despesas por Categoria</Text>
                  <View style={styles.chartBadge}>
                    <Text style={styles.chartBadgeText}>Período</Text>
                  </View>
                </View>
                <View style={styles.donutContainer}>
                  <DonutChart
                    data={donutData}
                    colors={colors}
                    size={160}
                    strokeWidth={25}
                  />
                </View>
                <View style={styles.donutLegend}>
                  {donutData.slice(0, 4).map((item, index) => (
                    <View key={index} style={styles.donutLegendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Row de Indicadores */}
            <View style={styles.indicatorsRow}>
              {/* Gauge - Taxa de Economia */}
              <View style={styles.gaugeCard}>
                <Text style={styles.gaugeTitle}>Taxa de Economia</Text>
                <GaugeChart
                  value={taxaEconomia}
                  maxValue={1}
                  colors={colors}
                  size={130}
                  label="do total"
                />
                <Text style={styles.gaugeSubtext}>
                  {taxaEconomia >= 0.2 ? 'Parabéns! Boa economia' : 'Tente economizar mais'}
                </Text>
              </View>

              {/* Gauge - Uso do Orçamento */}
              <View style={styles.gaugeCard}>
                <Text style={styles.gaugeTitle}>Uso do Orçamento</Text>
                <GaugeChart
                  value={orcamentoMensal}
                  maxValue={1}
                  colors={colors}
                  size={130}
                  label="utilizado"
                />
                <Text style={styles.gaugeSubtext}>
                  {orcamentoMensal < 0.8 ? 'Dentro do planejado' : 'Atenção aos gastos!'}
                </Text>
              </View>

              {/* Mini Sparklines */}
              <View style={styles.sparklinesCard}>
                <Text style={styles.gaugeTitle}>Tendência (14 dias)</Text>
                <View style={styles.sparklineRow}>
                  <View style={styles.sparklineItem}>
                    <View style={styles.sparklineHeader}>
                      <Ionicons name="arrow-up-circle" size={16} color={colors.success} />
                      <Text style={styles.sparklineLabel}>Receitas</Text>
                    </View>
                    <Sparkline data={sparklineReceitas} color={colors.success} width={100} height={35} />
                  </View>
                  <View style={styles.sparklineItem}>
                    <View style={styles.sparklineHeader}>
                      <Ionicons name="arrow-down-circle" size={16} color={colors.danger} />
                      <Text style={styles.sparklineLabel}>Despesas</Text>
                    </View>
                    <Sparkline data={sparklineDespesas} color={colors.danger} width={100} height={35} />
                  </View>
                </View>
              </View>
            </View>

            {/* Top Despesas */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Top 5 Despesas</Text>
                <View style={styles.chartBadge}>
                  <Text style={styles.chartBadgeText}>Ranking</Text>
                </View>
              </View>
              {topDespesas.length > 0 ? (
                <HorizontalBarChart data={topDespesas} colors={colors} />
              ) : (
                <Text style={styles.emptyText}>Nenhuma despesa no período</Text>
              )}
            </View>
          </View>

          {/* Coluna Lateral */}
          <View style={styles.sideColumn}>
            {/* Card do Usuário */}
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeText}>ATIVO</Text>
                </View>
                <TouchableOpacity onPress={toggleTheme}>
                  <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#f59e0b' : '#6366f1'} />
                </TouchableOpacity>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userPlan}>Express Stage</Text>
                </View>
              </View>
              <View style={styles.userCardNumber}>
                <Text style={styles.userCardLabel}>Conta Principal</Text>
                <Text style={styles.userCardDigits}>•••• •••• •••• 5409</Text>
              </View>
            </View>

            {/* Saldos por Moeda */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Saldos por Moeda</Text>
              </View>
              {Object.entries(calcularPorMoeda).map(([moeda, valores]) => {
                const m = MOEDAS.find(m => m.codigo === moeda) || MOEDAS[0];
                return (
                  <View key={moeda} style={styles.currencyItem}>
                    <View style={styles.currencyLeft}>
                      <View style={[styles.currencyIcon, { backgroundColor: colors.primaryLight }]}>
                        <Text style={styles.currencySymbol}>{m.simbolo}</Text>
                      </View>
                      <View>
                        <Text style={styles.currencyCode}>{moeda}</Text>
                        <Text style={styles.currencyName}>{m.nome}</Text>
                      </View>
                    </View>
                    <Text style={[styles.currencyBalance, { color: valores.saldo >= 0 ? colors.success : colors.danger }]}>
                      {formatCurrency(valores.saldo, moeda)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Próximas Contas */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próximas Contas</Text>
                <TouchableOpacity>
                  <Text style={styles.seeMoreText}>Ver mais</Text>
                </TouchableOpacity>
              </View>

              {proximasContas.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma conta pendente</Text>
              ) : (
                proximasContas.map((conta) => {
                  const m = MOEDAS.find(m => m.codigo === conta.moeda) || MOEDAS[0];
                  const hoje = new Date();
                  const vencimento = new Date(conta.ano_referencia, conta.mes_referencia - 1, conta.dia_vencimento);
                  const mesNome = vencimento.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

                  return (
                    <View key={conta.id} style={styles.billItem}>
                      <View style={styles.billDate}>
                        <Text style={styles.billMonth}>{mesNome}</Text>
                        <Text style={styles.billDay}>{conta.dia_vencimento}</Text>
                      </View>
                      <View style={styles.billInfo}>
                        <View style={[styles.billIcon, { backgroundColor: colors.warningLight }]}>
                          <Ionicons name="receipt" size={16} color={colors.warning} />
                        </View>
                        <View style={styles.billDetails}>
                          <Text style={styles.billName}>{conta.nome}</Text>
                          <Text style={styles.billPlan}>Mensal</Text>
                        </View>
                      </View>
                      <Text style={styles.billValue}>{formatCurrency(conta.valor, conta.moeda || 'BRL')}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Calendário */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Selecionar Período</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Presets rápidos */}
            <View style={styles.presetsContainer}>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'semana', label: '7 dias' },
                { id: 'mes', label: 'Este mês' },
                { id: 'trimestre', label: '3 meses' },
                { id: 'ano', label: 'Este ano' },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.presetBtn}
                  onPress={() => aplicarPreset(preset.id)}
                >
                  <Text style={styles.presetBtnText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Navegação do mês */}
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={() => {
                if (calendarioMes === 0) {
                  setCalendarioMes(11);
                  setCalendarioAno(calendarioAno - 1);
                } else {
                  setCalendarioMes(calendarioMes - 1);
                }
              }}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthYear}>
                {MESES_COMPLETOS[calendarioMes]} {calendarioAno}
              </Text>
              <TouchableOpacity onPress={() => {
                if (calendarioMes === 11) {
                  setCalendarioMes(0);
                  setCalendarioAno(calendarioAno + 1);
                } else {
                  setCalendarioMes(calendarioMes + 1);
                }
              }}>
                <Ionicons name="chevron-forward" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Dias da semana */}
            <View style={styles.weekDaysRow}>
              {DIAS_SEMANA.map((dia) => (
                <Text key={dia} style={styles.weekDayText}>{dia}</Text>
              ))}
            </View>

            {/* Grid de dias */}
            <View style={styles.daysGrid}>
              {gerarDiasCalendario().map((dia, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    dia !== null && estaNoRange(dia) ? styles.dayCellInRange : undefined,
                    dia !== null && eDataInicio(dia) ? styles.dayCellStart : undefined,
                    dia !== null && eDataFim(dia) ? styles.dayCellEnd : undefined,
                  ]}
                  onPress={() => dia !== null && selecionarData(dia)}
                  disabled={dia === null}
                >
                  {dia !== null && (
                    <Text style={[
                      styles.dayText,
                      estaNoRange(dia) ? styles.dayTextInRange : undefined,
                      (eDataInicio(dia) || eDataFim(dia)) ? styles.dayTextSelected : undefined,
                    ]}>
                      {dia}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Range selecionado */}
            <View style={styles.selectedRangeInfo}>
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Início</Text>
                <Text style={styles.rangeValue}>
                  {dataInicio.toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Fim</Text>
                <Text style={styles.rangeValue}>
                  {dataFim.toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>

            <Text style={styles.calendarHint}>
              {selecionandoInicio ? 'Selecione a data inicial' : 'Selecione a data final'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal Seletor de Moeda */}
      <Modal visible={showMoedaSelector} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoedaSelector(false)}
        >
          <View style={styles.moedaModal}>
            <View style={styles.moedaModalHeader}>
              <Text style={styles.moedaModalTitle}>Exibir valores em</Text>
              <TouchableOpacity onPress={() => setShowMoedaSelector(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {MODOS_MOEDA.map((modo) => (
              <TouchableOpacity
                key={modo.codigo}
                style={[
                  styles.moedaOption,
                  modoMoeda === modo.codigo && styles.moedaOptionActive,
                ]}
                onPress={() => {
                  setModoMoeda(modo.codigo as ModoMoeda);
                  setShowMoedaSelector(false);
                }}
              >
                {modo.codigo === 'MISTO' ? (
                  <View style={styles.moedaOptionIcon}>
                    <Ionicons name="layers-outline" size={24} color={colors.primary} />
                  </View>
                ) : (
                  <Text style={styles.moedaOptionFlag}>{modo.bandeira}</Text>
                )}
                <View style={styles.moedaOptionInfo}>
                  <Text style={styles.moedaOptionName}>{modo.nome}</Text>
                  {modo.codigo !== 'MISTO' && (
                    <Text style={styles.moedaOptionDesc}>
                      Converte todos os valores para {modo.codigo}
                    </Text>
                  )}
                  {modo.codigo === 'MISTO' && (
                    <Text style={styles.moedaOptionDesc}>
                      Mostra cada moeda separadamente
                    </Text>
                  )}
                </View>
                {modoMoeda === modo.codigo && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.cotacoesInfo}>
              <Text style={styles.cotacoesTitle}>Cotações atuais (para BRL)</Text>
              <View style={styles.cotacoesGrid}>
                {MOEDAS.filter(m => m.codigo !== 'BRL').map((moeda) => (
                  <View key={moeda.codigo} style={styles.cotacaoItem}>
                    <Text style={styles.cotacaoFlag}>{moeda.bandeira}</Text>
                    <Text style={styles.cotacaoCode}>{moeda.codigo}</Text>
                    <Text style={styles.cotacaoValue}>R$ {cotacoes[moeda.codigo]?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
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
  scrollView: {
    flex: 1,
  },
  mainContent: {
    flexDirection: isWeb ? 'row' : 'column',
    padding: 24,
    gap: 24,
  },
  mainColumn: {
    flex: isWeb ? 2 : 1,
    gap: 20,
  },
  sideColumn: {
    flex: isWeb ? 1 : 1,
    gap: 20,
    maxWidth: isWeb ? 380 : '100%',
  },

  // Overview Header
  overviewHeader: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isWeb ? 'center' : 'flex-start',
    gap: 16,
  },
  overviewTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },

  // Metrics
  metricsRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Upgrade Card - Estilo escuro com accent mint
  upgradeCard: {
    backgroundColor: colors.sidebarBg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  upgradeContent: {
    flexDirection: 'row',
    padding: 24,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 4,
  },
  upgradeHighlight: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  upgradeDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  upgradeBtnText: {
    color: '#0f1f1a',
    fontWeight: '600',
    fontSize: 14,
  },
  upgradeIllustration: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinStack: {
    alignItems: 'center',
  },
  coin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Chart
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  breakdownCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chartSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  breakdownSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  chartBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chartBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  chartSummary: {
    marginBottom: 20,
  },
  chartSummaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  breakdownChartContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: isWeb ? '48%' : '100%',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  categoryPercent: {
    backgroundColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryPercentText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Charts Row
  chartsRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 20,
  },
  chartCardHalf: {
    flex: 1,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  donutContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  donutLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '45%',
  },

  // Indicators Row
  indicatorsRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 20,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  gaugeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  gaugeSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  sparklinesCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sparklineRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  sparklineItem: {
    alignItems: 'center',
  },
  sparklineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sparklineLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // User Card - Estilo mint green inspirado nas imagens
  userCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userBadgeText: {
    color: '#0f1f1a',
    fontSize: 10,
    fontWeight: '700',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  userAvatarText: {
    color: '#0f1f1a',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f1f1a',
  },
  userPlan: {
    fontSize: 13,
    color: 'rgba(15, 31, 26, 0.7)',
    marginTop: 2,
  },
  userCardNumber: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
  },
  userCardLabel: {
    fontSize: 11,
    color: '#4a6359',
  },
  userCardDigits: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1f1a',
    marginTop: 4,
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seeMoreText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Currency Items
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  currencyName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  currencyBalance: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Bills
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 16,
  },
  billMonth: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  billDay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  billInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  billPlan: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  billValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  // Header Controls
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  datePickerText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  moedaSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  moedaSelectorText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  moedaFlag: {
    fontSize: 18,
  },

  // Metric Badge
  metricMoeda: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Calendar Modal
  calendarModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: isWeb ? 400 : '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetBtn: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellInRange: {
    backgroundColor: colors.primaryLight,
  },
  dayCellStart: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  dayCellEnd: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
  },
  dayTextInRange: {
    color: colors.primary,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedRangeInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rangeItem: {
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  calendarHint: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 12,
  },

  // Moeda Modal
  moedaModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: isWeb ? 400 : '90%',
    maxWidth: 400,
  },
  moedaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moedaModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  moedaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moedaOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  moedaOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moedaOptionFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  moedaOptionInfo: {
    flex: 1,
  },
  moedaOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  moedaOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cotacoesInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cotacoesTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  cotacoesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cotacaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  cotacaoFlag: {
    fontSize: 16,
  },
  cotacaoCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cotacaoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
});
