import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';

// Alert multiplataforma
const showAlert = (title: string, message: string, buttons: { text: string; style?: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    const confirmBtn = buttons.find(b => b.style === 'destructive' || b.text === 'OK' || b.text === 'Sair');
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    
    if (cancelBtn && confirmBtn) {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmBtn.onPress) {
        confirmBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (confirmBtn?.onPress) confirmBtn.onPress();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

export default function PerfilScreen() {
  const [user, setUser] = useState({ name: '', email: '', telefone: '' });
  const [telefone, setTelefone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);

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
        showAlert('Sucesso', 'Telefone atualizado com sucesso!', [{ text: 'OK' }]);
      } else {
        showAlert('Erro', 'Não foi possível salvar o telefone', [{ text: 'OK' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Erro de conexão', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header com Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Card Conta */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#166534" />
          <Text style={styles.cardTitle}>Informações da Conta</Text>
        </View>
        
        <View style={styles.cardItem}>
          <View style={styles.cardItemIcon}>
            <Ionicons name="mail-outline" size={18} color="#64748b" />
          </View>
          <View style={styles.cardItemContent}>
            <Text style={styles.cardItemLabel}>E-mail</Text>
            <Text style={styles.cardItemValue}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardItem}>
          <View style={styles.cardItemIcon}>
            <Ionicons name="call-outline" size={18} color="#64748b" />
          </View>
          <View style={styles.cardItemContent}>
            <Text style={styles.cardItemLabel}>Telefone</Text>
            {editingPhone ? (
              <View style={styles.phoneEditContainer}>
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
                  style={styles.savePhoneBtn} 
                  onPress={savePhone}
                  disabled={saving}
                >
                  <Text style={styles.savePhoneBtnText}>{saving ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelPhoneBtn} 
                  onPress={() => { setEditingPhone(false); setTelefone(user.telefone || ''); }}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.phoneDisplayContainer}>
                <Text style={styles.cardItemValue}>
                  {user.telefone || 'Não cadastrado'}
                </Text>
                <TouchableOpacity onPress={() => setEditingPhone(true)}>
                  <Ionicons name="pencil" size={18} color="#166534" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Card WhatsApp */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.cardTitle}>Integração WhatsApp</Text>
        </View>
        
        <Text style={styles.whatsappDesc}>
          Envie suas transações por WhatsApp! Basta salvar nosso número e mandar mensagens como "Gastei 50 reais no mercado".
        </Text>

        <View style={styles.whatsappSteps}>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Cadastre seu telefone acima</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Salve nosso número: (11) 99999-0000</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Envie suas transações por mensagem!</Text>
          </View>
        </View>

        {!user.telefone && (
          <View style={styles.whatsappAlert}>
            <Ionicons name="alert-circle" size={18} color="#f59e0b" />
            <Text style={styles.whatsappAlertText}>Cadastre seu telefone para usar esta função</Text>
          </View>
        )}
      </View>

      {/* Botão Sair */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Nexfy v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: { 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'web' ? 30 : 60, 
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  avatar: { 
    width: 88, 
    height: 88, 
    borderRadius: 44, 
    backgroundColor: '#166534', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 22, color: '#1e293b', fontWeight: 'bold' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  
  card: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 16,
    borderRadius: 16, 
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  cardTitle: { 
    color: '#1e293b', 
    fontSize: 16, 
    fontWeight: '600',
    marginLeft: 10
  },
  cardItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start'
  },
  cardItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardItemContent: { flex: 1 },
  cardItemLabel: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  cardItemValue: { color: '#1e293b', fontSize: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },

  phoneDisplayContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  phoneEditContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 4
  },
  phoneInput: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    borderRadius: 10, 
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  savePhoneBtn: { 
    backgroundColor: '#166534', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 10,
    marginLeft: 8
  },
  savePhoneBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelPhoneBtn: { 
    padding: 8,
    marginLeft: 4
  },

  whatsappDesc: { 
    color: '#64748b', 
    fontSize: 14, 
    lineHeight: 20,
    marginBottom: 16
  },
  whatsappSteps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepNumber: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#dcfce7', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  stepNumberText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  stepText: { color: '#334155', fontSize: 14, flex: 1 },
  whatsappAlert: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fef3c7', 
    padding: 12, 
    borderRadius: 10,
    marginTop: 16
  },
  whatsappAlertText: { 
    color: '#92400e', 
    fontSize: 13, 
    marginLeft: 8,
    flex: 1
  },

  logoutBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2', 
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  version: { 
    textAlign: 'center', 
    color: '#94a3b8', 
    fontSize: 12, 
    marginTop: 24 
  },
});
