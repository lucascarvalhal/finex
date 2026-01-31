import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { API_URL } from '../config/api';

// IDs do Google OAuth
const GOOGLE_WEB_CLIENT_ID = '663336797453-nj08cg080a6e3rl5kvk21hr96fr1e5m1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '663336797453-9l07ke525ps87bnlkbnk2o9on1jpk3uo.apps.googleusercontent.com';
const GOOGLE_EXPO_CLIENT_ID = '663336797453-nj08cg080a6e3rl5kvk21hr96fr1e5m1.apps.googleusercontent.com';

// Google Auth habilitado em todas as plataformas
const GOOGLE_AUTH_ENABLED = true;

// Alert multiplataforma
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Configuração do Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    expoClientId: GOOGLE_EXPO_CLIENT_ID,
  });

  // Processar resposta do Google
  React.useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuth(response.authentication?.accessToken);
    }
  }, [response]);

  const checkPhoneAndRedirect = async (token: string) => {
    try {
      // Verificar se usuário tem telefone cadastrado
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const userData = await meResponse.json();

      if (userData.telefone) {
        // Tem telefone, vai direto pro app
        await AsyncStorage.setItem('phoneRegistered', 'true');
        router.replace('/(tabs)');
      } else {
        // Não tem telefone, vai para cadastro
        router.replace('/cadastro-telefone');
      }
    } catch (error) {
      // Em caso de erro, vai pro app mesmo
      router.replace('/(tabs)');
    }
  };

  const handleGoogleAuth = async (accessToken: string | undefined) => {
    if (!accessToken) return;

    setGoogleLoading(true);
    try {
      // Buscar informações do usuário no Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();

      // Enviar para nossa API
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          email: userInfo.email,
          name: userInfo.name,
          google_id: userInfo.id,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('token', data.access_token);
        // Verificar se precisa cadastrar telefone
        await checkPhoneAndRedirect(data.access_token);
      } else {
        showAlert('Erro', data.detail || 'Erro ao autenticar com Google');
      }
    } catch (error) {
      showAlert('Erro', 'Não foi possível autenticar com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Erro', 'Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('token', data.access_token);
        // Verificar se precisa cadastrar telefone
        await checkPhoneAndRedirect(data.access_token);
      } else {
        showAlert('Erro', data.detail || 'Credenciais inválidas');
      }
    } catch (error) {
      showAlert('Erro', 'Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = () => {
    promptAsync();
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="wallet" size={40} color="#10b981" />
        </View>
        <Text style={styles.title}>Nexfy</Text>
        <Text style={styles.subtitle}>Seu assessor financeiro</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGooglePress}
          disabled={googleLoading}
        >
          <Ionicons name="logo-google" size={20} color="#ea4335" />
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Conectando...' : 'Continuar com Google'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/cadastro')} style={styles.registerContainer}>
        <Text style={styles.registerText}>Não tem conta?</Text>
        <Text style={styles.registerLink}> Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4
  },
  formContainer: {
    gap: 16
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  inputIcon: {
    marginLeft: 16
  },
  input: {
    flex: 1,
    color: '#fff',
    padding: 16,
    fontSize: 16
  },
  eyeBtn: {
    padding: 16
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155'
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 14
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600'
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32
  },
  registerText: {
    color: '#64748b',
    fontSize: 15
  },
  registerLink: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '600'
  }
});
