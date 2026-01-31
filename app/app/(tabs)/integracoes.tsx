import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

import { API_URL } from '../../config/api';
const NEXFY_WHATSAPP = '5511936183690'; // Número do Nexfy (ajustar depois)

// Alert multiplataforma
const showAlert = (title: string, message: string, buttons: { text: string; style?: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    const confirmBtn = buttons.find(b => b.text === 'OK');
    window.alert(`${title}\n\n${message}`);
    if (confirmBtn?.onPress) confirmBtn.onPress();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

export default function IntegracoesScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const [user, setUser] = useState({ name: '', email: '', telefone: '' });
  const [telefone, setTelefone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setTelefone(data.telefone || '');
        setWhatsappConnected(!!data.telefone);
      }
    } catch (error) {
      console.log('Erro ao buscar usuário');
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    setTelefone(formatPhone(value));
  };

  const savePhone = async () => {
    if (telefone.replace(/\D/g, '').length < 10) {
      showAlert('Erro', 'Digite um número de telefone válido', [{ text: 'OK' }]);
      return;
    }
    
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/update-phone`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ telefone: telefone.replace(/\D/g, '') }),
      });
      if (response.ok) {
        setUser({ ...user, telefone });
        setEditingPhone(false);
        setWhatsappConnected(true);
        showAlert('Sucesso', 'Telefone cadastrado! Agora você pode usar o WhatsApp para registrar transações.', [{ text: 'OK' }]);
      } else {
        showAlert('Erro', 'Não foi possível salvar o telefone', [{ text: 'OK' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Erro de conexão', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá! Quero começar a registrar minhas transações pelo WhatsApp.');
    const url = `https://wa.me/${NEXFY_WHATSAPP}?text=${message}`;
    
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Integrações</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Conecte serviços externos ao Nexfy</Text>
        </View>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: colors.backgroundSecondary }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={20}
            color={isDark ? '#f59e0b' : '#6366f1'}
          />
        </TouchableOpacity>
      </View>

      {/* WhatsApp Integration Card */}
      <View style={[styles.integrationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.integrationHeader}>
          <View style={[styles.integrationIconContainer, { backgroundColor: colors.successLight }]}>
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </View>
          <View style={styles.integrationInfo}>
            <Text style={[styles.integrationTitle, { color: colors.text }]}>WhatsApp</Text>
            <View style={[styles.statusBadge, whatsappConnected ? { backgroundColor: colors.successLight } : { backgroundColor: colors.inputBg }]}>
              <View style={[styles.statusDot, whatsappConnected ? styles.dotConnected : styles.dotDisconnected]} />
              <Text style={[styles.statusText, whatsappConnected ? styles.textConnected : { color: colors.textSecondary }]}>
                {whatsappConnected ? 'Conectado' : 'Não configurado'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
          Registre suas transações enviando mensagens de texto pelo WhatsApp.
          Nossa IA interpreta automaticamente e adiciona ao seu controle financeiro.
        </Text>

        {/* Exemplos de uso */}
        <View style={[styles.examplesContainer, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>Exemplos de mensagens:</Text>
          <View style={[styles.exampleBubble, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.exampleText, { color: colors.success }]}>"Gastei 45 reais no mercado"</Text>
          </View>
          <View style={[styles.exampleBubble, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.exampleText, { color: colors.success }]}>"Recebi 3500 de salário"</Text>
          </View>
          <View style={[styles.exampleBubble, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.exampleText, { color: colors.success }]}>"Paguei 150 de luz"</Text>
          </View>
        </View>

        {/* Setup Steps */}
        <View style={styles.setupContainer}>
          <Text style={[styles.setupTitle, { color: colors.text }]}>Como configurar:</Text>

          {/* Step 1 */}
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.border }, user.telefone && styles.stepCompleted]}>
              {user.telefone ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepNumberText, { color: colors.textSecondary }]}>1</Text>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Cadastre seu número de telefone</Text>

              {!user.telefone && !editingPhone && (
                <TouchableOpacity style={[styles.stepAction, { backgroundColor: colors.successLight }]} onPress={() => setEditingPhone(true)}>
                  <Text style={styles.stepActionText}>Cadastrar telefone</Text>
                  <Ionicons name="chevron-forward" size={16} color="#166534" />
                </TouchableOpacity>
              )}

              {editingPhone && (
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={[styles.phoneInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={telefone}
                    onChangeText={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={savePhone}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {user.telefone && (
                <View style={styles.phoneDisplay}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  <Text style={[styles.phoneDisplayText, { color: colors.text }]}>{formatPhone(user.telefone)}</Text>
                  <TouchableOpacity onPress={() => setEditingPhone(true)}>
                    <Text style={styles.editLink}>Alterar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.border }]}>
              <Text style={[styles.stepNumberText, { color: colors.textSecondary }]}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Salve o número do Nexfy</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Adicione nosso número aos seus contatos:</Text>
              <View style={[styles.nexfyNumber, { backgroundColor: colors.successLight }]}>
                <Ionicons name="call" size={18} color="#166534" />
                <Text style={styles.nexfyNumberText}>+55 11 99999-0000</Text>
                <TouchableOpacity style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.border }]}>
              <Text style={[styles.stepNumberText, { color: colors.textSecondary }]}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Comece a enviar transações!</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Envie uma mensagem para testar:</Text>
              <TouchableOpacity
                style={[styles.whatsappBtn, !user.telefone && styles.whatsappBtnDisabled]}
                onPress={openWhatsApp}
                disabled={!user.telefone}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.whatsappBtnText}>Abrir WhatsApp</Text>
              </TouchableOpacity>
              {!user.telefone && (
                <Text style={[styles.disabledHint, { color: colors.textMuted }]}>Cadastre seu telefone primeiro</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Outras Integrações (Em breve) */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Em breve</Text>

      <View style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.comingSoonIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="mail-outline" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={[styles.comingSoonTitle, { color: colors.textSecondary }]}>E-mail</Text>
          <Text style={[styles.comingSoonDesc, { color: colors.textMuted }]}>Receba relatórios semanais</Text>
        </View>
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.comingSoonBadgeText, { color: colors.textMuted }]}>Em breve</Text>
        </View>
      </View>

      <View style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.comingSoonIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="card-outline" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={[styles.comingSoonTitle, { color: colors.textSecondary }]}>Open Finance</Text>
          <Text style={[styles.comingSoonDesc, { color: colors.textMuted }]}>Sincronize com seu banco</Text>
        </View>
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.comingSoonBadgeText, { color: colors.textMuted }]}>Em breve</Text>
        </View>
      </View>

      <View style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.comingSoonIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={[styles.comingSoonTitle, { color: colors.textSecondary }]}>Google Calendar</Text>
          <Text style={[styles.comingSoonDesc, { color: colors.textMuted }]}>Lembretes de contas</Text>
        </View>
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.comingSoonBadgeText, { color: colors.textMuted }]}>Em breve</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  integrationCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  integrationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  integrationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  integrationInfo: { flex: 1 },
  integrationTitle: { fontSize: 20, fontWeight: 'bold' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotConnected: { backgroundColor: '#16a34a' },
  dotDisconnected: { backgroundColor: '#94a3b8' },
  statusText: { fontSize: 12, fontWeight: '600' },
  textConnected: { color: '#16a34a' },
  integrationDesc: { fontSize: 14, lineHeight: 22, marginBottom: 20 },

  examplesContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  examplesTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  exampleBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  exampleText: { fontSize: 14 },

  setupContainer: { gap: 20 },
  setupTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  step: { flexDirection: 'row' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepCompleted: { backgroundColor: '#16a34a' },
  stepNumberText: { fontSize: 13, fontWeight: 'bold' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  stepDesc: { fontSize: 13, marginBottom: 10 },
  stepAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  stepActionText: { color: '#166534', fontWeight: '600', fontSize: 14, marginRight: 4 },

  phoneInputContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  phoneInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  phoneDisplay: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  phoneDisplayText: { fontSize: 14, fontWeight: '500' },
  editLink: { color: '#166534', fontSize: 13, fontWeight: '600' },

  nexfyNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
    alignSelf: 'flex-start',
  },
  nexfyNumberText: { color: '#166534', fontSize: 15, fontWeight: '600' },
  copyBtn: { padding: 4 },

  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
  },
  whatsappBtnDisabled: { backgroundColor: '#94a3b8' },
  whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabledHint: { fontSize: 12, marginTop: 8, textAlign: 'center' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  comingSoonInfo: { flex: 1 },
  comingSoonTitle: { fontSize: 15, fontWeight: '600' },
  comingSoonDesc: { fontSize: 13, marginTop: 2 },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonBadgeText: { fontSize: 11, fontWeight: '600' },
});
