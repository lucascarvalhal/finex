import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Integrações</Text>
        <Text style={styles.headerSubtitle}>Conecte serviços externos ao Nexfy</Text>
      </View>

      {/* WhatsApp Integration Card */}
      <View style={styles.integrationCard}>
        <View style={styles.integrationHeader}>
          <View style={styles.integrationIconContainer}>
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </View>
          <View style={styles.integrationInfo}>
            <Text style={styles.integrationTitle}>WhatsApp</Text>
            <View style={[styles.statusBadge, whatsappConnected ? styles.statusConnected : styles.statusDisconnected]}>
              <View style={[styles.statusDot, whatsappConnected ? styles.dotConnected : styles.dotDisconnected]} />
              <Text style={[styles.statusText, whatsappConnected ? styles.textConnected : styles.textDisconnected]}>
                {whatsappConnected ? 'Conectado' : 'Não configurado'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.integrationDesc}>
          Registre suas transações enviando mensagens de texto pelo WhatsApp. 
          Nossa IA interpreta automaticamente e adiciona ao seu controle financeiro.
        </Text>

        {/* Exemplos de uso */}
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Exemplos de mensagens:</Text>
          <View style={styles.exampleBubble}>
            <Text style={styles.exampleText}>"Gastei 45 reais no mercado"</Text>
          </View>
          <View style={styles.exampleBubble}>
            <Text style={styles.exampleText}>"Recebi 3500 de salário"</Text>
          </View>
          <View style={styles.exampleBubble}>
            <Text style={styles.exampleText}>"Paguei 150 de luz"</Text>
          </View>
        </View>

        {/* Setup Steps */}
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Como configurar:</Text>
          
          {/* Step 1 */}
          <View style={styles.step}>
            <View style={[styles.stepNumber, user.telefone && styles.stepCompleted]}>
              {user.telefone ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={styles.stepNumberText}>1</Text>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Cadastre seu número de telefone</Text>
              
              {!user.telefone && !editingPhone && (
                <TouchableOpacity style={styles.stepAction} onPress={() => setEditingPhone(true)}>
                  <Text style={styles.stepActionText}>Cadastrar telefone</Text>
                  <Ionicons name="chevron-forward" size={16} color="#166534" />
                </TouchableOpacity>
              )}
              
              {editingPhone && (
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    value={telefone}
                    onChangeText={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#94a3b8"
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
                  <Text style={styles.phoneDisplayText}>{formatPhone(user.telefone)}</Text>
                  <TouchableOpacity onPress={() => setEditingPhone(true)}>
                    <Text style={styles.editLink}>Alterar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Salve o número do Nexfy</Text>
              <Text style={styles.stepDesc}>Adicione nosso número aos seus contatos:</Text>
              <View style={styles.nexfyNumber}>
                <Ionicons name="call" size={18} color="#166534" />
                <Text style={styles.nexfyNumberText}>+55 11 99999-0000</Text>
                <TouchableOpacity style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Comece a enviar transações!</Text>
              <Text style={styles.stepDesc}>Envie uma mensagem para testar:</Text>
              <TouchableOpacity 
                style={[styles.whatsappBtn, !user.telefone && styles.whatsappBtnDisabled]} 
                onPress={openWhatsApp}
                disabled={!user.telefone}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.whatsappBtnText}>Abrir WhatsApp</Text>
              </TouchableOpacity>
              {!user.telefone && (
                <Text style={styles.disabledHint}>Cadastre seu telefone primeiro</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Outras Integrações (Em breve) */}
      <Text style={styles.sectionTitle}>Em breve</Text>
      
      <View style={styles.comingSoonCard}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="mail-outline" size={24} color="#94a3b8" />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={styles.comingSoonTitle}>E-mail</Text>
          <Text style={styles.comingSoonDesc}>Receba relatórios semanais</Text>
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>Em breve</Text>
        </View>
      </View>

      <View style={styles.comingSoonCard}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="card-outline" size={24} color="#94a3b8" />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={styles.comingSoonTitle}>Open Finance</Text>
          <Text style={styles.comingSoonDesc}>Sincronize com seu banco</Text>
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>Em breve</Text>
        </View>
      </View>

      <View style={styles.comingSoonCard}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="calendar-outline" size={24} color="#94a3b8" />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={styles.comingSoonTitle}>Google Calendar</Text>
          <Text style={styles.comingSoonDesc}>Lembretes de contas</Text>
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>Em breve</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: { 
    padding: 20, 
    paddingTop: Platform.OS === 'web' ? 20 : 50, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { color: '#1e293b', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },

  integrationCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  integrationInfo: { flex: 1 },
  integrationTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6
  },
  statusConnected: { backgroundColor: '#dcfce7' },
  statusDisconnected: { backgroundColor: '#f1f5f9' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotConnected: { backgroundColor: '#16a34a' },
  dotDisconnected: { backgroundColor: '#94a3b8' },
  statusText: { fontSize: 12, fontWeight: '600' },
  textConnected: { color: '#16a34a' },
  textDisconnected: { color: '#64748b' },
  integrationDesc: { color: '#64748b', fontSize: 14, lineHeight: 22, marginBottom: 20 },

  examplesContainer: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 12, 
    padding: 16,
    marginBottom: 24
  },
  examplesTitle: { color: '#64748b', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  exampleBubble: { 
    backgroundColor: '#dcfce7', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  exampleText: { color: '#166534', fontSize: 14 },

  setupContainer: { gap: 20 },
  setupTitle: { color: '#1e293b', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  step: { flexDirection: 'row' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2
  },
  stepCompleted: { backgroundColor: '#16a34a' },
  stepNumberText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  stepContent: { flex: 1 },
  stepTitle: { color: '#1e293b', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  stepDesc: { color: '#64748b', fontSize: 13, marginBottom: 10 },
  stepAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  stepActionText: { color: '#166534', fontWeight: '600', fontSize: 14, marginRight: 4 },

  phoneInputContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  phoneInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  saveBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center'
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  phoneDisplay: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  phoneDisplayText: { color: '#1e293b', fontSize: 14, fontWeight: '500' },
  editLink: { color: '#166534', fontSize: 13, fontWeight: '600' },

  nexfyNumber: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
    alignSelf: 'flex-start'
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
    marginTop: 4
  },
  whatsappBtnDisabled: { backgroundColor: '#94a3b8' },
  whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabledHint: { color: '#94a3b8', fontSize: 12, marginTop: 8, textAlign: 'center' },

  sectionTitle: { 
    color: '#64748b', 
    fontSize: 13, 
    fontWeight: '600', 
    marginHorizontal: 16, 
    marginTop: 24, 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  comingSoonInfo: { flex: 1 },
  comingSoonTitle: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  comingSoonDesc: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  comingSoonBadge: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  comingSoonBadgeText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
});
