import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../config/api';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

// Formatar telefone brasileiro
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// Validar telefone
const isValidPhone = (phone: string) => {
  const numbers = phone.replace(/\D/g, '');
  return numbers.length === 10 || numbers.length === 11;
};

export default function CadastroTelefoneScreen() {
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    setTelefone(formatPhone(text));
  };

  const handleSubmit = async () => {
    if (!isValidPhone(telefone)) {
      showAlert('Erro', 'Digite um número de telefone válido com DDD');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/update-phone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ telefone: telefone.replace(/\D/g, '') }),
      });

      if (response.ok) {
        // Marcar que o telefone foi cadastrado
        await AsyncStorage.setItem('phoneRegistered', 'true');
        router.replace('/(tabs)');
      } else {
        const data = await response.json();
        showAlert('Erro', data.detail || 'Erro ao cadastrar telefone');
      }
    } catch (error) {
      showAlert('Erro', 'Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="logo-whatsapp" size={60} color="#25D366" />
        </View>

        <Text style={styles.title}>Vincule seu WhatsApp</Text>
        <Text style={styles.subtitle}>
          Para usar o assistente financeiro via WhatsApp, precisamos do seu número.
          Assim você poderá registrar despesas e consultar seu saldo diretamente pelo chat!
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            placeholderTextColor="#64748b"
            value={telefone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={15}
          />
          {isValidPhone(telefone) && (
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={styles.validIcon} />
          )}
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#10b981" />
            <Text style={styles.featureText}>Registre despesas por mensagem de texto</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="mic" size={20} color="#10b981" />
            <Text style={styles.featureText}>Envie áudios para registrar gastos</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={20} color="#10b981" />
            <Text style={styles.featureText}>Fotografe notas fiscais para lançamento automático</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="stats-chart" size={20} color="#10b981" />
            <Text style={styles.featureText}>Consulte seu saldo e resumos</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, !isValidPhone(telefone) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !isValidPhone(telefone)}
        >
          {loading ? (
            <Text style={styles.buttonText}>Salvando...</Text>
          ) : (
            <>
              <Text style={styles.buttonText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyText}>
          Seu número será usado apenas para identificar suas mensagens no WhatsApp.
          Não enviaremos spam.
        </Text>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={async () => {
            await AsyncStorage.setItem('phoneSkipped', 'true');
            router.replace('/(tabs)');
          }}
        >
          <Text style={styles.skipButtonText}>Agora não, configurar depois</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    padding: 16,
    fontSize: 18,
    letterSpacing: 1,
  },
  validIcon: {
    marginRight: 16,
  },
  features: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  privacyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  skipButton: {
    marginTop: 20,
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
