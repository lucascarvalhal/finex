import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, TextInput, Platform, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G, Rect, Line, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// Ícones personalizados
const icons = {
  wallet: require('../../assets/icons/Wallet_64.png'),
  banknotes: require('../../assets/icons/Banknotes_64.png'),
  creditCard: require('../../assets/icons/Credit_Card_64.png'),
  coinBag: require('../../assets/icons/Coin_Bag_64.png'),
  barChart: require('../../assets/icons/Bar_Chart_64.png'),
  target: require('../../assets/icons/Financial_Target_64.png'),
  bank: require('../../assets/icons/Bank_64.png'),
  coin: require('../../assets/icons/Coin_64.png'),
  calculator: require('../../assets/icons/Calculator_64.png'),
  report: require('../../assets/icons/Financial_Report_64.png'),
};

// Categorias pré-definidas
const CATEGORIAS_PADRAO = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Vestuário',
  'Serviços',
  'Assinaturas',
  'Outros',
];

// Moedas mais utilizadas no mundo
const MOEDAS = [
  { codigo: 'BRL', simbolo: 'R$', nome: 'Real Brasileiro', locale: 'pt-BR', decimais: 2 },
  { codigo: 'USD', simbolo: '$', nome: 'Dólar Americano', locale: 'en-US', decimais: 2 },
  { codigo: 'EUR', simbolo: '€', nome: 'Euro', locale: 'de-DE', decimais: 2 },
  { codigo: 'GBP', simbolo: '£', nome: 'Libra Esterlina', locale: 'en-GB', decimais: 2 },
  { codigo: 'JPY', simbolo: '¥', nome: 'Iene Japonês', locale: 'ja-JP', decimais: 0 },
];

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
  moeda?: string;
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
  moeda?: string;
}

interface Meta {
  id: number;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  cor: string;
  moeda?: string;
}

interface Investimento {
  id: number;
  nome: string;
  tipo: string;
  valor_investido: number;
  valor_atual: number;
  ticker: string;
  moeda?: string;
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
  'Vestuário': '#f59e0b',
  'Serviços': '#06b6d4',
  'Assinaturas': '#a855f7',
  'Outros': '#64748b',
  'Geral': '#6366f1',
};

// Componente FormModal movido para fora para evitar re-renders
const FormModal = ({ visible, onClose, title, onSave, children, styles }: any) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

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
  
  // Calendário
  const [calendarioAtivo, setCalendarioAtivo] = useState<'inicio' | 'fim' | null>(null);
  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [calAno, setCalAno] = useState(new Date().getFullYear());
  
  // Modais
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalContaFixa, setModalContaFixa] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalMeta, setModalMeta] = useState(false);
  const [modalInvestimento, setModalInvestimento] = useState(false);
  
  // Forms
  const [formNome, setFormNome] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formValorNumerico, setFormValorNumerico] = useState(0);
  const [formCategoria, setFormCategoria] = useState('Alimentação');
  const [formDia, setFormDia] = useState('1');
  const [formParcelas, setFormParcelas] = useState('1');
  const [formTipo, setFormTipo] = useState('');
  const [formTicker, setFormTicker] = useState('');
  
  // Moeda selecionada para entrada de dados
  const [moedaSelecionada, setMoedaSelecionada] = useState(MOEDAS[0]); // BRL como padrão
  const [mostrarSeletorMoeda, setMostrarSeletorMoeda] = useState(false);
  
  // Moeda de visualização (converte valores para essa moeda)
  const [moedaVisualizacao, setMoedaVisualizacao] = useState<string>('TODAS');
  const [mostrarSeletorMoedaVis, setMostrarSeletorMoedaVis] = useState(false);
  
  // Cotações em tempo real (base: BRL)
  // Valor = quanto 1 unidade da moeda vale em BRL
  const [cotacoes, setCotacoes] = useState<{ [key: string]: number }>({
    BRL: 1,
    USD: 6.0,
    EUR: 6.5,
    GBP: 7.5,
    JPY: 0.04,
  });
  const [cotacoesCarregadas, setCotacoesCarregadas] = useState(false);

  // Buscar cotações em tempo real
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
        setCotacoesCarregadas(true);
        console.log('Cotações atualizadas:', data);
      } catch (error) {
        console.log('Erro ao buscar cotações, usando valores padrão');
        setCotacoesCarregadas(true);
      }
    };
    fetchCotacoes();
    // Atualizar cotações a cada 5 minutos
    const interval = setInterval(fetchCotacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Carregar moeda preferida do storage
  useEffect(() => {
    const loadMoeda = async () => {
      try {
        const saved = await AsyncStorage.getItem('moedaPreferida');
        if (saved) {
          const moeda = MOEDAS.find(m => m.codigo === saved);
          if (moeda) setMoedaSelecionada(moeda);
        }
        const savedVis = await AsyncStorage.getItem('moedaVisualizacao');
        if (savedVis) setMoedaVisualizacao(savedVis);
      } catch (e) { console.log('Erro ao carregar moeda'); }
    };
    loadMoeda();
  }, []);

  // Salvar moeda preferida
  const salvarMoeda = async (moeda: typeof MOEDAS[0]) => {
    setMoedaSelecionada(moeda);
    setMostrarSeletorMoeda(false);
    await AsyncStorage.setItem('moedaPreferida', moeda.codigo);
  };

  // Salvar moeda de visualização
  const salvarMoedaVisualizacao = async (codigo: string) => {
    setMoedaVisualizacao(codigo);
    setMostrarSeletorMoedaVis(false);
    await AsyncStorage.setItem('moedaVisualizacao', codigo);
  };

  // Função para formatar valor enquanto digita
  const formatarValorInput = (texto: string) => {
    // Remove tudo que não é número
    const apenasNumeros = texto.replace(/\D/g, '');
    
    if (!apenasNumeros) {
      setFormValor('');
      setFormValorNumerico(0);
      return;
    }
    
    // Converte para número considerando decimais
    const valorNumerico = moedaSelecionada.decimais > 0 
      ? parseInt(apenasNumeros) / Math.pow(10, moedaSelecionada.decimais)
      : parseInt(apenasNumeros);
    
    setFormValorNumerico(valorNumerico);
    
    // Formata para exibição
    const valorFormatado = valorNumerico.toLocaleString(moedaSelecionada.locale, {
      minimumFractionDigits: moedaSelecionada.decimais,
      maximumFractionDigits: moedaSelecionada.decimais,
    });
    
    setFormValor(`${moedaSelecionada.simbolo} ${valorFormatado}`);
  };

  // Função para converter valor entre moedas
  const converterMoeda = (valor: number, moedaOrigem: string, moedaDestino: string): number => {
    if (moedaOrigem === moedaDestino) return valor;
    // Converte para BRL primeiro, depois para moeda destino
    const valorEmBRL = valor * (cotacoes[moedaOrigem] || 1);
    const valorConvertido = valorEmBRL / (cotacoes[moedaDestino] || 1);
    return valorConvertido;
  };

  // Função para formatar moeda para exibição (com moeda específica)
  const formatCurrencyWithCode = (value: number, codigo: string = 'BRL') => {
    const moeda = MOEDAS.find(m => m.codigo === codigo) || MOEDAS[0];
    return value.toLocaleString(moeda.locale, { 
      style: 'currency', 
      currency: moeda.codigo 
    });
  };

  // Função para formatar valor com conversão opcional
  const formatValorExibicao = (valor: number, moedaOriginal: string = 'BRL') => {
    if (moedaVisualizacao === 'TODAS') {
      // Mostra na moeda original
      return formatCurrencyWithCode(valor, moedaOriginal);
    } else {
      // Converte para moeda de visualização
      const valorConvertido = converterMoeda(valor, moedaOriginal, moedaVisualizacao);
      return formatCurrencyWithCode(valorConvertido, moedaVisualizacao);
    }
  };

  // Função para formatar moeda para exibição (usado nos cards)
  const formatCurrency = (value: number) => {
    return value.toLocaleString(moedaSelecionada.locale, { 
      style: 'currency', 
      currency: moedaSelecionada.codigo 
    });
  };
  
  // Categorias personalizadas
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState<string[]>([]);
  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [modalGerenciarCategorias, setModalGerenciarCategorias] = useState(false);
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null);
  const [novoNomeCategoria, setNovoNomeCategoria] = useState('');
  
  // Todas as categorias disponíveis
  const todasCategorias = useMemo(() => {
    return [...CATEGORIAS_PADRAO, ...categoriasPersonalizadas];
  }, [categoriasPersonalizadas]);

  // Carregar categorias personalizadas do storage
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const saved = await AsyncStorage.getItem('categoriasPersonalizadas');
        if (saved) setCategoriasPersonalizadas(JSON.parse(saved));
      } catch (e) { console.log('Erro ao carregar categorias'); }
    };
    loadCategorias();
  }, []);

  // Salvar nova categoria
  const adicionarCategoria = async () => {
    if (novaCategoria.trim() && !todasCategorias.includes(novaCategoria.trim())) {
      const novas = [...categoriasPersonalizadas, novaCategoria.trim()];
      setCategoriasPersonalizadas(novas);
      await AsyncStorage.setItem('categoriasPersonalizadas', JSON.stringify(novas));
      setFormCategoria(novaCategoria.trim());
      setNovaCategoria('');
      setMostrarNovaCategoria(false);
    }
  };

  // Editar categoria personalizada
  const editarCategoria = async (categoriaAntiga: string) => {
    if (!novoNomeCategoria.trim() || novoNomeCategoria.trim() === categoriaAntiga) {
      setEditandoCategoria(null);
      setNovoNomeCategoria('');
      return;
    }
    
    // Verificar se já existe
    if (todasCategorias.includes(novoNomeCategoria.trim()) && novoNomeCategoria.trim() !== categoriaAntiga) {
      return;
    }

    const novas = categoriasPersonalizadas.map(c => 
      c === categoriaAntiga ? novoNomeCategoria.trim() : c
    );
    setCategoriasPersonalizadas(novas);
    await AsyncStorage.setItem('categoriasPersonalizadas', JSON.stringify(novas));
    setEditandoCategoria(null);
    setNovoNomeCategoria('');
  };

  // Remover categoria personalizada
  const removerCategoria = async (categoria: string) => {
    const novas = categoriasPersonalizadas.filter(c => c !== categoria);
    setCategoriasPersonalizadas(novas);
    await AsyncStorage.setItem('categoriasPersonalizadas', JSON.stringify(novas));
  };

  // Adicionar categoria do modal de gerenciamento
  const adicionarCategoriaGerenciamento = async () => {
    if (novaCategoria.trim() && !todasCategorias.includes(novaCategoria.trim())) {
      const novas = [...categoriasPersonalizadas, novaCategoria.trim()];
      setCategoriasPersonalizadas(novas);
      await AsyncStorage.setItem('categoriasPersonalizadas', JSON.stringify(novas));
      setNovaCategoria('');
    }
  };

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

  // Filtrar transações do mês ou período (sem filtrar por moeda - mostra tudo)
  const transacoesFiltradas = useMemo(() => {
    let filtered = transacoes;
    
    // Filtro por período
    if (filtroAtivo === 'periodo' && dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      filtered = filtered.filter(t => {
        const d = new Date(t.data);
        return d >= inicio && d <= fim;
      });
    } else {
      filtered = filtered.filter(t => {
        const d = new Date(t.data);
        return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
      });
    }
    
    return filtered;
  }, [transacoes, mesSelecionado, anoSelecionado, filtroAtivo, dataInicio, dataFim]);

  // Moedas únicas nas transações (para saber quais moedas o usuário usa)
  const moedasEmUso = useMemo(() => {
    const moedas = new Set<string>();
    transacoes.forEach(t => moedas.add(t.moeda || 'BRL'));
    contasFixas.forEach(c => moedas.add(c.moeda || 'BRL'));
    investimentos.forEach(i => moedas.add(i.moeda || 'BRL'));
    return Array.from(moedas);
  }, [transacoes, contasFixas, investimentos]);

  // Função para obter valor convertido
  const getValorConvertido = (valor: number, moedaOriginal: string = 'BRL') => {
    if (moedaVisualizacao === 'TODAS') {
      return valor; // Retorna valor original
    }
    return converterMoeda(valor, moedaOriginal, moedaVisualizacao);
  };

  // Calcular totais
  const entradas = useMemo(() => {
    return transacoesFiltradas.filter(t => t.tipo === 'receita');
  }, [transacoesFiltradas]);

  const gastosVariaveis = useMemo(() => {
    return transacoesFiltradas.filter(t => t.tipo === 'despesa');
  }, [transacoesFiltradas]);

  // Totais com conversão
  const totalEntradas = useMemo(() => {
    return entradas.reduce((sum, t) => sum + getValorConvertido(t.valor, t.moeda || 'BRL'), 0);
  }, [entradas, moedaVisualizacao, cotacoes]);

  const totalContasFixas = useMemo(() => {
    return contasFixas.reduce((sum, c) => sum + getValorConvertido(c.valor, c.moeda || 'BRL'), 0);
  }, [contasFixas, moedaVisualizacao, cotacoes]);

  const totalGastosVariaveis = useMemo(() => {
    return gastosVariaveis.reduce((sum, t) => sum + getValorConvertido(t.valor, t.moeda || 'BRL'), 0);
  }, [gastosVariaveis, moedaVisualizacao, cotacoes]);

  const totalSaidas = totalContasFixas + totalGastosVariaveis;
  const restante = totalEntradas - totalSaidas;

  const totalInvestido = useMemo(() => {
    return investimentos.reduce((sum, i) => sum + getValorConvertido(i.valor_atual, i.moeda || 'BRL'), 0);
  }, [investimentos, moedaVisualizacao, cotacoes]);

  // Dados para gráfico de Gastos por Categoria
  const gastosPorCategoria = useMemo(() => {
    const categorias: { [key: string]: number } = {};
    gastosVariaveis.forEach(g => {
      const cat = g.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + getValorConvertido(g.valor, g.moeda || 'BRL');
    });
    return Object.entries(categorias)
      .map(([nome, valor]) => ({
        nome,
        valor,
        cor: categoriaCores[nome] || '#64748b'
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [gastosVariaveis, moedaVisualizacao, cotacoes]);

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
      
      // Converter valores conforme moeda de visualização
      const entradas = transacoesMes.filter(t => t.tipo === 'receita').reduce((sum, t) => {
        return sum + getValorConvertido(t.valor, t.moeda || 'BRL');
      }, 0);
      const saidas = transacoesMes.filter(t => t.tipo === 'despesa').reduce((sum, t) => {
        return sum + getValorConvertido(t.valor, t.moeda || 'BRL');
      }, 0);
      
      resultado.push({
        mes: mesesCurtos[mes],
        entradas,
        saidas,
        saldo: entradas - saidas
      });
    }
    return resultado;
  }, [transacoes, mesSelecionado, anoSelecionado, moedaVisualizacao, cotacoes]);

  // Evolução do saldo acumulado
  const evolucaoSaldo = useMemo(() => {
    let saldoAcumulado = 0;
    return dadosMensais.map(d => {
      saldoAcumulado += d.saldo;
      return { ...d, saldoAcumulado };
    });
  }, [dadosMensais]);

  const formatCurrencyShort = (value: number) => {
    const moeda = moedaVisualizacao === 'TODAS' 
      ? MOEDAS[0] 
      : MOEDAS.find(m => m.codigo === moedaVisualizacao) || MOEDAS[0];
    if (value >= 1000000) return `${moeda.simbolo}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${moeda.simbolo}${(value / 1000).toFixed(1)}K`;
    return `${moeda.simbolo}${value.toFixed(0)}`;
  };

  const resetForm = () => {
    setFormNome('');
    setFormValor('');
    setFormValorNumerico(0);
    setFormCategoria('Alimentação');
    setFormDia('1');
    setFormParcelas('1');
    setFormTipo('');
    setFormTicker('');
    setMostrarNovaCategoria(false);
    setNovaCategoria('');
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

  // Funções do Calendário
  const getDiasNoMes = (mes: number, ano: number) => new Date(ano, mes + 1, 0).getDate();
  const getPrimeiroDiaSemana = (mes: number, ano: number) => new Date(ano, mes, 1).getDay();

  const selecionarData = (dia: number) => {
    const dataFormatada = `${calAno}-${String(calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (calendarioAtivo === 'inicio') {
      setDataInicio(dataFormatada);
    } else if (calendarioAtivo === 'fim') {
      setDataFim(dataFormatada);
    }
    setCalendarioAtivo(null);
  };

  const navegarMes = (direcao: number) => {
    let novoMes = calMes + direcao;
    let novoAno = calAno;
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    setCalMes(novoMes);
    setCalAno(novoAno);
  };

  const formatarDataExibicao = (data: string) => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Componente Calendário
  const Calendario = () => {
    const diasNoMes = getDiasNoMes(calMes, calAno);
    const primeiroDia = getPrimeiroDiaSemana(calMes, calAno);
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias = [];
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
      dias.push(<View key={`empty-${i}`} style={styles.calDia} />);
    }
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataAtual = `${calAno}-${String(calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const isInicio = dataInicio === dataAtual;
      const isFim = dataFim === dataAtual;
      const isHoje = new Date().toISOString().split('T')[0] === dataAtual;
      
      dias.push(
        <TouchableOpacity
          key={dia}
          style={[
            styles.calDia,
            isInicio && styles.calDiaInicio,
            isFim && styles.calDiaFim,
            isHoje && !isInicio && !isFim && styles.calDiaHoje,
          ]}
          onPress={() => selecionarData(dia)}
        >
          <Text style={[
            styles.calDiaText,
            (isInicio || isFim) && styles.calDiaTextSelected,
          ]}>
            {dia}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendario}>
        {/* Header do Calendário */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => navegarMes(-1)} style={styles.calNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#166534" />
          </TouchableOpacity>
          <Text style={styles.calMesAno}>{meses[calMes]} {calAno}</Text>
          <TouchableOpacity onPress={() => navegarMes(1)} style={styles.calNavBtn}>
            <Ionicons name="chevron-forward" size={20} color="#166534" />
          </TouchableOpacity>
        </View>
        
        {/* Dias da Semana */}
        <View style={styles.calSemana}>
          {diasSemana.map(d => (
            <Text key={d} style={styles.calSemanaText}>{d}</Text>
          ))}
        </View>
        
        {/* Grid de Dias */}
        <View style={styles.calGrid}>
          {dias}
        </View>
      </View>
    );
  };

  // Criar Entrada (Receita)
  const handleAddEntrada = async () => {
    if (!formNome || formValorNumerico <= 0) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          descricao: formNome,
          valor: formValorNumerico,
          tipo: 'receita',
          categoria: formCategoria,
          data: `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-15`,
          moeda: moedaSelecionada.codigo
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
    if (!formNome || formValorNumerico <= 0) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/contas-fixas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          valor: formValorNumerico,
          dia_vencimento: parseInt(formDia),
          categoria: formCategoria,
          mes_referencia: mesSelecionado + 1,
          ano_referencia: anoSelecionado,
          parcela_atual: 1,
          parcela_total: parseInt(formParcelas),
          moeda: moedaSelecionada.codigo
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
    if (!formNome || formValorNumerico <= 0) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          descricao: formNome,
          valor: formValorNumerico,
          tipo: 'despesa',
          categoria: formCategoria,
          data: `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(formDia).padStart(2, '0')}`,
          moeda: moedaSelecionada.codigo
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
    if (!formNome || formValorNumerico <= 0) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/metas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          valor_alvo: formValorNumerico,
          categoria: formCategoria,
          moeda: moedaSelecionada.codigo
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
    if (!formNome || formValorNumerico <= 0 || !formTipo) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/investimentos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: formNome,
          tipo: formTipo,
          valor_investido: formValorNumerico,
          valor_atual: formValorNumerico,
          ticker: formTicker,
          moeda: moedaSelecionada.codigo
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

    const valorFormatado = moedaVisualizacao === 'TODAS' 
      ? 'Selecione moeda' 
      : formatCurrencyWithCode(disponivel, moedaVisualizacao);

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
          <Text style={[styles.donutValue, { color: disponivel >= 0 ? '#10b981' : '#ef4444', fontSize: moedaVisualizacao === 'TODAS' ? 12 : 20 }]}>{valorFormatado}</Text>
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
          <Text style={[styles.donutValue, { color: '#ef4444', fontSize: moedaVisualizacao === 'TODAS' ? 12 : 16 }]}>
            {moedaVisualizacao === 'TODAS' ? 'Selecione moeda' : formatCurrencyWithCode(total, moedaVisualizacao)}
          </Text>
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

  // Componente de seleção de categoria
  const CategoriaSelector = () => (
    <View>
      <Text style={styles.inputLabel}>Categoria</Text>
      <View style={styles.categoriasContainer}>
        {todasCategorias.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoriaChip,
              formCategoria === cat && styles.categoriaChipActive
            ]}
            onPress={() => setFormCategoria(cat)}
          >
            <Text style={[
              styles.categoriaChipText,
              formCategoria === cat && styles.categoriaChipTextActive
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.categoriaChip, styles.categoriaChipAdd]}
          onPress={() => setMostrarNovaCategoria(true)}
        >
          <Ionicons name="add" size={16} color="#166534" />
          <Text style={styles.categoriaChipAddText}>Nova</Text>
        </TouchableOpacity>
      </View>
      
      {mostrarNovaCategoria && (
        <View style={styles.novaCategoriaContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginTop: 0 }]}
            value={novaCategoria}
            onChangeText={setNovaCategoria}
            placeholder="Nome da categoria"
            placeholderTextColor="#94a3b8"
            autoFocus
          />
          <TouchableOpacity style={styles.novaCategoriaBtn} onPress={adicionarCategoria}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.novaCategoriaBtn, { backgroundColor: '#94a3b8', marginLeft: 8 }]} 
            onPress={() => { setMostrarNovaCategoria(false); setNovaCategoria(''); }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Card Header
  const CardHeader = ({ title, onAdd, onConfig, color = '#166534', icon }: { title: string; onAdd?: () => void; onConfig?: () => void; color?: string; icon?: any }) => (
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <View style={styles.cardHeaderLeft}>
        {icon && <Image source={icon} style={styles.cardIcon} />}
        <Text style={styles.cardHeaderText}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {onConfig && (
          <TouchableOpacity onPress={onConfig} style={styles.configBtn}>
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {onAdd && (
          <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={icons.wallet} style={styles.logoIcon} />
            <Text style={styles.logoText}>Nexfy</Text>
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
          
          {/* Botão Filtro Moeda */}
          <TouchableOpacity 
            style={[styles.filterBtn, styles.moedaFilterBtn]} 
            onPress={() => setMostrarSeletorMoedaVis(true)}
          >
            <Ionicons name="cash-outline" size={18} color="#166534" />
            <Text style={styles.moedaFilterBtnText}>
              {moedaVisualizacao === 'TODAS' ? 'Todas' : moedaVisualizacao}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          
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
            <CardHeader title="Entradas" onAdd={() => setModalEntrada(true)} icon={icons.banknotes} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>NOME</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR</Text>
              </View>
              {entradas.length > 0 ? entradas.slice(0, 5).map((e, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{e.descricao}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#10b981' }]}>{formatValorExibicao(e.valor, e.moeda || 'BRL')}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhuma entrada</Text>}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{moedaVisualizacao === 'TODAS' ? '(múltiplas moedas)' : formatCurrencyWithCode(totalEntradas, moedaVisualizacao)}</Text>
              </View>
            </View>
          </View>

          {/* Card Restante para Gastar */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { backgroundColor: '#166534' }]}>
              <View style={styles.cardHeaderLeft}>
                <Image source={icons.calculator} style={styles.cardIcon} />
                <Text style={styles.cardHeaderText}>Restante para Gastar</Text>
              </View>
            </View>
            <View style={[styles.cardBody, { alignItems: 'center', paddingVertical: 20 }]}>
              <DonutChart disponivel={restante} total={totalEntradas} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Entradas →</Text>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>{moedaVisualizacao === 'TODAS' ? 'Selecione moeda' : formatCurrencyWithCode(totalEntradas, moedaVisualizacao)}</Text>
                  <Text style={styles.summaryPercent}>↑ 12%</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Saídas →</Text>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{moedaVisualizacao === 'TODAS' ? 'Selecione moeda' : formatCurrencyWithCode(totalSaidas, moedaVisualizacao)}</Text>
                  <Text style={[styles.summaryPercent, { color: '#ef4444' }]}>↓ 5%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card Contas Fixas */}
          <View style={styles.card}>
            <CardHeader title="Contas Fixas" onAdd={() => setModalContaFixa(true)} icon={icons.creditCard} />
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
                  <Text style={[styles.tableCell, { flex: 1 }]}>{formatValorExibicao(c.valor, c.moeda || 'BRL')}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhuma conta fixa</Text>}
            </View>
          </View>

          {/* Card Gastos Variáveis */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="Gastos Variáveis" onAdd={() => setModalGasto(true)} onConfig={() => setModalGerenciarCategorias(true)} icon={icons.coinBag} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>CATEGORIA</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>DATA</Text>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>OBS</Text>
              </View>
              {gastosVariaveis.length > 0 ? gastosVariaveis.slice(0, 6).map((g, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{g.categoria}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#ef4444' }]}>{formatValorExibicao(g.valor, g.moeda || 'BRL')}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{new Date(g.data).toLocaleDateString('pt-BR')}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{g.descricao}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhum gasto variável</Text>}
            </View>
          </View>

          {/* Card Investimentos */}
          <View style={styles.card}>
            <CardHeader title="Investimentos" onAdd={() => setModalInvestimento(true)} icon={icons.bank} />
            <View style={styles.cardBody}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>NOME</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VALOR</Text>
              </View>
              {investimentos.length > 0 ? investimentos.slice(0, 4).map((inv, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{inv.nome}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#3b82f6' }]}>{formatValorExibicao(inv.valor_atual, inv.moeda || 'BRL')}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Nenhum investimento</Text>}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: '#3b82f6' }]}>{moedaVisualizacao === 'TODAS' ? '(múltiplas moedas)' : formatCurrencyWithCode(totalInvestido, moedaVisualizacao)}</Text>
              </View>
            </View>
          </View>

          {/* =========== NOVOS GRÁFICOS =========== */}

          {/* Gráfico 1: Gastos por Categoria */}
          <View style={styles.card}>
            <CardHeader title="Gastos por Categoria" color="#8b5cf6" icon={icons.coin} />
            <View style={[styles.cardBody, { alignItems: 'center' }]}>
              <CategoryDonutChart data={gastosPorCategoria} />
            </View>
          </View>

          {/* Gráfico 2: Entradas vs Saídas (6 meses) */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="Entradas vs Saídas (6 meses)" color="#0891b2" icon={icons.barChart} />
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
            <CardHeader title="Evolução do Saldo (6 meses)" color="#3b82f6" icon={icons.report} />
            <View style={[styles.cardBody, { alignItems: 'center' }]}>
              <LineChart data={evolucaoSaldo} />
              <View style={styles.saldoInfo}>
                <Text style={styles.saldoInfoLabel}>Saldo Atual Acumulado:</Text>
                <Text style={[styles.saldoInfoValue, { color: evolucaoSaldo[evolucaoSaldo.length - 1]?.saldoAcumulado >= 0 ? '#10b981' : '#ef4444' }]}>
                  {moedaVisualizacao === 'TODAS' ? 'Selecione moeda' : formatCurrencyWithCode(evolucaoSaldo[evolucaoSaldo.length - 1]?.saldoAcumulado || 0, moedaVisualizacao)}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Últimos Lançamentos */}
          <View style={[styles.card, styles.cardWide]}>
            <CardHeader title="Últimos Lançamentos" color="#8b5cf6" icon={icons.coin} />
            <View style={styles.cardBody}>
              {transacoesFiltradas.length > 0 ? (
                [...transacoesFiltradas]
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .slice(0, 8)
                  .map((t, i) => (
                    <View key={i} style={styles.lancamentoItem}>
                      <View style={[styles.lancamentoIcon, { backgroundColor: t.tipo === 'receita' ? '#10b98120' : '#ef444420' }]}>
                        <Ionicons 
                          name={t.tipo === 'receita' ? 'trending-up' : 'trending-down'} 
                          size={18} 
                          color={t.tipo === 'receita' ? '#10b981' : '#ef4444'} 
                        />
                      </View>
                      <View style={styles.lancamentoInfo}>
                        <Text style={styles.lancamentoDesc}>{t.descricao || t.categoria}</Text>
                        <Text style={styles.lancamentoCat}>{t.categoria} • {new Date(t.data).toLocaleDateString('pt-BR')}</Text>
                      </View>
                      <Text style={[styles.lancamentoValor, { color: t.tipo === 'receita' ? '#10b981' : '#ef4444' }]}>
                        {t.tipo === 'receita' ? '+' : '-'}{formatValorExibicao(t.valor, t.moeda || 'BRL')}
                      </Text>
                    </View>
                  ))
              ) : (
                <Text style={styles.emptyText}>Nenhum lançamento no período</Text>
              )}
            </View>
          </View>

          {/* Card Metas */}
          <View style={styles.card}>
            <CardHeader title="Metas Financeiras" onAdd={() => setModalMeta(true)} icon={icons.target} />
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
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por Período</Text>
              <TouchableOpacity onPress={() => { setModalFiltro(false); setCalendarioAtivo(null); }}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Seletores de Data */}
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerCol}>
                <Text style={styles.inputLabel}>Data Início</Text>
                <TouchableOpacity 
                  style={[styles.datePickerBtn, calendarioAtivo === 'inicio' && styles.datePickerBtnActive]}
                  onPress={() => setCalendarioAtivo(calendarioAtivo === 'inicio' ? null : 'inicio')}
                >
                  <Ionicons name="calendar-outline" size={18} color={calendarioAtivo === 'inicio' ? '#fff' : '#166534'} />
                  <Text style={[styles.datePickerText, calendarioAtivo === 'inicio' && styles.datePickerTextActive]}>
                    {dataInicio ? formatarDataExibicao(dataInicio) : 'Selecionar'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.datePickerArrow}>
                <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
              </View>
              
              <View style={styles.datePickerCol}>
                <Text style={styles.inputLabel}>Data Fim</Text>
                <TouchableOpacity 
                  style={[styles.datePickerBtn, calendarioAtivo === 'fim' && styles.datePickerBtnActive]}
                  onPress={() => setCalendarioAtivo(calendarioAtivo === 'fim' ? null : 'fim')}
                >
                  <Ionicons name="calendar-outline" size={18} color={calendarioAtivo === 'fim' ? '#fff' : '#166534'} />
                  <Text style={[styles.datePickerText, calendarioAtivo === 'fim' && styles.datePickerTextActive]}>
                    {dataFim ? formatarDataExibicao(dataFim) : 'Selecionar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Calendário */}
            {calendarioAtivo && (
              <View style={styles.calendarioContainer}>
                <Text style={styles.calendarioLabel}>
                  Selecionando: {calendarioAtivo === 'inicio' ? 'Data Início' : 'Data Fim'}
                </Text>
                <Calendario />
              </View>
            )}
            
            {/* Resumo do período selecionado */}
            {dataInicio && dataFim && (
              <View style={styles.periodoResumo}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.periodoResumoText}>
                  {formatarDataExibicao(dataInicio)} até {formatarDataExibicao(dataFim)}
                </Text>
              </View>
            )}
            
            <View style={styles.filterBtnsRow}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#64748b', marginRight: 8 }]} onPress={limparFiltro}>
                <Text style={styles.saveBtnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, { flex: 1, opacity: dataInicio && dataFim ? 1 : 0.5 }]} 
                onPress={aplicarFiltroPeriodo}
                disabled={!dataInicio || !dataFim}
              >
                <Text style={styles.saveBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Entrada */}
      <FormModal visible={modalEntrada} onClose={() => { setModalEntrada(false); resetForm(); }} title="Nova Entrada" onSave={handleAddEntrada} styles={styles}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Salário" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <View style={styles.valorInputContainer}>
          <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
            <Text style={styles.moedaBtnText}>{moedaSelecionada.simbolo}</Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, styles.valorInput]} 
            value={formValor} 
            onChangeText={formatarValorInput} 
            placeholder="0,00" 
            keyboardType="numeric" 
            placeholderTextColor="#94a3b8" 
          />
        </View>
      </FormModal>

      {/* Modal Conta Fixa */}
      <FormModal visible={modalContaFixa} onClose={() => { setModalContaFixa(false); resetForm(); }} title="Nova Conta Fixa" onSave={handleAddContaFixa} styles={styles}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Aluguel" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <View style={styles.valorInputContainer}>
          <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
            <Text style={styles.moedaBtnText}>{moedaSelecionada.simbolo}</Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, styles.valorInput]} 
            value={formValor} 
            onChangeText={formatarValorInput} 
            placeholder="0,00" 
            keyboardType="numeric" 
            placeholderTextColor="#94a3b8" 
          />
        </View>
        <Text style={styles.inputLabel}>Dia do Vencimento</Text>
        <TextInput style={styles.input} value={formDia} onChangeText={setFormDia} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Parcelas</Text>
        <TextInput style={styles.input} value={formParcelas} onChangeText={setFormParcelas} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Gasto */}
      <FormModal visible={modalGasto} onClose={() => { setModalGasto(false); resetForm(); setMostrarNovaCategoria(false); }} title="Novo Gasto" onSave={handleAddGasto} styles={styles}>
        <Text style={styles.inputLabel}>Descrição</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Supermercado" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <View style={styles.valorInputContainer}>
          <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
            <Text style={styles.moedaBtnText}>{moedaSelecionada.simbolo}</Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, styles.valorInput]} 
            value={formValor} 
            onChangeText={formatarValorInput} 
            placeholder="0,00" 
            keyboardType="numeric" 
            placeholderTextColor="#94a3b8" 
          />
        </View>
        <CategoriaSelector />
        <Text style={styles.inputLabel}>Dia</Text>
        <TextInput style={styles.input} value={formDia} onChangeText={setFormDia} placeholder="1" keyboardType="numeric" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Meta */}
      <FormModal visible={modalMeta} onClose={() => { setModalMeta(false); resetForm(); }} title="Nova Meta" onSave={handleAddMeta} styles={styles}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Viagem" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor Alvo</Text>
        <View style={styles.valorInputContainer}>
          <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
            <Text style={styles.moedaBtnText}>{moedaSelecionada.simbolo}</Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, styles.valorInput]} 
            value={formValor} 
            onChangeText={formatarValorInput} 
            placeholder="0,00" 
            keyboardType="numeric" 
            placeholderTextColor="#94a3b8" 
          />
        </View>
      </FormModal>

      {/* Modal Investimento */}
      <FormModal visible={modalInvestimento} onClose={() => { setModalInvestimento(false); resetForm(); }} title="Novo Investimento" onSave={handleAddInvestimento} styles={styles}>
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput style={styles.input} value={formNome} onChangeText={setFormNome} placeholder="Ex: Tesouro Selic" placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Tipo</Text>
        <TextInput style={styles.input} value={formTipo} onChangeText={setFormTipo} placeholder="Renda Fixa, Ações, FII..." placeholderTextColor="#94a3b8" />
        <Text style={styles.inputLabel}>Valor</Text>
        <View style={styles.valorInputContainer}>
          <TouchableOpacity style={styles.moedaBtn} onPress={() => setMostrarSeletorMoeda(true)}>
            <Text style={styles.moedaBtnText}>{moedaSelecionada.simbolo}</Text>
            <Ionicons name="chevron-down" size={14} color="#166534" />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, styles.valorInput]} 
            value={formValor} 
            onChangeText={formatarValorInput} 
            placeholder="0,00" 
            keyboardType="numeric" 
            placeholderTextColor="#94a3b8" 
          />
        </View>
        <Text style={styles.inputLabel}>Ticker (opcional)</Text>
        <TextInput style={styles.input} value={formTicker} onChangeText={setFormTicker} placeholder="PETR4" placeholderTextColor="#94a3b8" />
      </FormModal>

      {/* Modal Seletor de Moeda */}
      <Modal visible={mostrarSeletorMoeda} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostrarSeletorMoeda(false)}>
          <View style={styles.moedaModalContent}>
            <Text style={styles.moedaModalTitle}>Selecione a Moeda</Text>
            {MOEDAS.map((moeda) => (
              <TouchableOpacity 
                key={moeda.codigo} 
                style={[styles.moedaOption, moedaSelecionada.codigo === moeda.codigo && styles.moedaOptionActive]}
                onPress={() => salvarMoeda(moeda)}
              >
                <Text style={styles.moedaOptionSimbolo}>{moeda.simbolo}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moedaOptionNome}>{moeda.nome}</Text>
                  <Text style={styles.moedaOptionCodigo}>{moeda.codigo}</Text>
                </View>
                {moedaSelecionada.codigo === moeda.codigo && (
                  <Ionicons name="checkmark-circle" size={22} color="#166534" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Seletor de Moeda de Visualização */}
      <Modal visible={mostrarSeletorMoedaVis} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostrarSeletorMoedaVis(false)}>
          <View style={styles.moedaModalContent}>
            <Text style={styles.moedaModalTitle}>Visualizar em</Text>
            <TouchableOpacity 
              style={[styles.moedaOption, moedaVisualizacao === 'TODAS' && styles.moedaOptionActive]}
              onPress={() => salvarMoedaVisualizacao('TODAS')}
            >
              <Text style={styles.moedaOptionSimbolo}>🌍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.moedaOptionNome}>Moedas Originais</Text>
                <Text style={styles.moedaOptionCodigo}>Cada item na sua moeda</Text>
              </View>
              {moedaVisualizacao === 'TODAS' && (
                <Ionicons name="checkmark-circle" size={22} color="#166534" />
              )}
            </TouchableOpacity>
            {MOEDAS.map((moeda) => (
              <TouchableOpacity 
                key={moeda.codigo} 
                style={[styles.moedaOption, moedaVisualizacao === moeda.codigo && styles.moedaOptionActive]}
                onPress={() => salvarMoedaVisualizacao(moeda.codigo)}
              >
                <Text style={styles.moedaOptionSimbolo}>{moeda.simbolo}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moedaOptionNome}>Tudo em {moeda.nome}</Text>
                  <Text style={styles.moedaOptionCodigo}>Converte para {moeda.codigo}</Text>
                </View>
                {moedaVisualizacao === moeda.codigo && (
                  <Ionicons name="checkmark-circle" size={22} color="#166534" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Gerenciar Categorias */}
      <Modal visible={modalGerenciarCategorias} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Categorias</Text>
              <TouchableOpacity onPress={() => setModalGerenciarCategorias(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Categorias Padrão</Text>
              {CATEGORIAS_PADRAO.map((cat) => (
                <View key={cat} style={styles.categoriaItemContainer}>
                  <View style={[styles.categoriaItemIcon, { backgroundColor: categoriaCores[cat] }]} />
                  <Text style={styles.categoriaItemNome}>{cat}</Text>
                  <Text style={styles.categoriaItemBadge}>Padrão</Text>
                </View>
              ))}
              
              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Categorias Personalizadas</Text>
              {categoriasPersonalizadas.length === 0 ? (
                <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>
                  Nenhuma categoria personalizada
                </Text>
              ) : (
                categoriasPersonalizadas.map((cat) => (
                  <View key={cat} style={styles.categoriaItemContainer}>
                    {editandoCategoria === cat ? (
                      <>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          value={novoNomeCategoria}
                          onChangeText={setNovoNomeCategoria}
                          autoFocus
                        />
                        <TouchableOpacity 
                          style={styles.categoriaActionBtn}
                          onPress={() => editarCategoria(cat)}
                        >
                          <Ionicons name="checkmark" size={20} color="#10b981" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.categoriaActionBtn}
                          onPress={() => { setEditandoCategoria(null); setNovoNomeCategoria(''); }}
                        >
                          <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={[styles.categoriaItemIcon, { backgroundColor: '#64748b' }]} />
                        <Text style={[styles.categoriaItemNome, { flex: 1 }]}>{cat}</Text>
                        <TouchableOpacity 
                          style={styles.categoriaActionBtn}
                          onPress={() => { setEditandoCategoria(cat); setNovoNomeCategoria(cat); }}
                        >
                          <Ionicons name="pencil" size={18} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.categoriaActionBtn}
                          onPress={() => removerCategoria(cat)}
                        >
                          <Ionicons name="trash" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))
              )}
              
              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Adicionar Nova Categoria</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Nome da categoria"
                  placeholderTextColor="#94a3b8"
                  value={novaCategoria}
                  onChangeText={setNovaCategoria}
                />
                <TouchableOpacity 
                  style={[styles.saveBtn, { paddingHorizontal: 16 }]}
                  onPress={adicionarCategoriaGerenciamento}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 20 }]}
              onPress={() => setModalGerenciarCategorias(false)}
            >
              <Text style={styles.saveBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: isWeb ? 20 : 50, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: 'bold', color: '#166534' },
  logoIcon: { width: 32, height: 32, marginRight: 8 },

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
  moedaFilterBtn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#bbf7d0', marginRight: 8 },
  moedaFilterBtnText: { fontSize: 12, color: '#166534', fontWeight: '600' },

  mainGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', width: isWeb ? 'calc(33.333% - 12px)' : '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardWide: { width: isWeb ? 'calc(66.666% - 8px)' : '100%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  cardHeaderText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 24, height: 24, marginRight: 8 },
  addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  configBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  categoriaItemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8 },
  categoriaItemIcon: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  categoriaItemNome: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  categoriaItemBadge: { fontSize: 11, color: '#64748b', backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 'auto' },
  categoriaActionBtn: { padding: 8, marginLeft: 4 },
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

  lancamentoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lancamentoIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lancamentoInfo: { flex: 1 },
  lancamentoDesc: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  lancamentoCat: { fontSize: 12, color: '#64748b', marginTop: 2 },
  lancamentoValor: { fontSize: 14, fontWeight: '600' },

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

  // Estilos do Calendário
  datePickerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  datePickerCol: { flex: 1 },
  datePickerArrow: { paddingHorizontal: 12, paddingBottom: 12 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, gap: 8 },
  datePickerBtnActive: { backgroundColor: '#166534', borderColor: '#166534' },
  datePickerText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  datePickerTextActive: { color: '#fff' },
  
  calendarioContainer: { marginTop: 16, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16 },
  calendarioLabel: { fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  calendario: { },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calNavBtn: { padding: 8, backgroundColor: '#e2e8f0', borderRadius: 8 },
  calMesAno: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  calSemana: { flexDirection: 'row', marginBottom: 8 },
  calSemanaText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDia: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  calDiaText: { fontSize: 14, color: '#334155' },
  calDiaInicio: { backgroundColor: '#166534', borderRadius: 20 },
  calDiaFim: { backgroundColor: '#10b981', borderRadius: 20 },
  calDiaHoje: { borderWidth: 2, borderColor: '#166534', borderRadius: 20 },
  calDiaTextSelected: { color: '#fff', fontWeight: '600' },
  
  periodoResumo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12, backgroundColor: '#ecfdf5', borderRadius: 8, gap: 8 },
  periodoResumoText: { fontSize: 14, color: '#166534', fontWeight: '500' },

  // Estilos do Seletor de Categorias
  categoriasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  categoriaChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  categoriaChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  categoriaChipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  categoriaChipTextActive: { color: '#fff' },
  categoriaChipAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' },
  categoriaChipAddText: { fontSize: 13, color: '#166534', fontWeight: '500' },
  novaCategoriaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  novaCategoriaBtn: { backgroundColor: '#166534', borderRadius: 8, padding: 10 },

  // Estilos do Campo de Valor e Seletor de Moeda
  valorInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  valorInput: { flex: 1, marginTop: 0 },
  moedaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  moedaBtnText: { fontSize: 16, fontWeight: '700', color: '#166534' },
  moedaModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 340 },
  moedaModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16, textAlign: 'center' },
  moedaOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: '#f8fafc', gap: 12 },
  moedaOptionActive: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#bbf7d0' },
  moedaOptionSimbolo: { fontSize: 20, fontWeight: '700', color: '#166534', width: 40, textAlign: 'center' },
  moedaOptionNome: { fontSize: 14, fontWeight: '600', color: '#334155' },
  moedaOptionCodigo: { fontSize: 12, color: '#94a3b8' },
});
