import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config/api';

// Alert multiplataforma
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

// Validação de email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de senha
const getPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  return { checks, strength };
};

export default function CadastroScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const passwordInfo = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const getStrengthColor = () => {
    if (passwordInfo.strength <= 2) return '#ef4444';
    if (passwordInfo.strength <= 3) return '#f59e0b';
    if (passwordInfo.strength <= 4) return '#22c55e';
    return '#16a34a';
  };

  const getStrengthLabel = () => {
    if (passwordInfo.strength <= 2) return 'Fraca';
    if (passwordInfo.strength <= 3) return 'Média';
    if (passwordInfo.strength <= 4) return 'Forte';
    return 'Muito Forte';
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showAlert('Erro', 'Preencha todos os campos');
      return;
    }
    if (name.trim().length < 2) {
      showAlert('Erro', 'O nome deve ter pelo menos 2 caracteres');
      return;
    }
    if (!emailValid) {
      showAlert('Erro', 'Digite um email válido');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Erro', 'As senhas não coincidem');
      return;
    }
    if (passwordInfo.strength < 5) {
      showAlert('Erro', 'A senha deve conter:\n• Mínimo 8 caracteres\n• Letra maiúscula\n• Letra minúscula\n• Número\n• Caractere especial (!@#$%^&*)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        showAlert('Sucesso', 'Conta criada com sucesso! Faça login para continuar.', () => {
          router.replace('/login');
        });
      } else {
        // Tratar erros de validação do backend
        if (data.detail && Array.isArray(data.detail)) {
          const errorMsg = data.detail.map((e: any) => e.msg).join('\n');
          showAlert('Erro', errorMsg);
        } else {
          showAlert('Erro', data.detail || 'Erro ao cadastrar');
        }
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header com botão voltar */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="person-add" size={36} color="#166534" />
          </View>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Comece sua jornada financeira</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[
              styles.inputContainer,
              emailTouched && !emailValid && email.length > 0 && styles.inputError,
              emailTouched && emailValid && styles.inputSuccess
            ]}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {emailTouched && email.length > 0 && (
                <Ionicons
                  name={emailValid ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={emailValid ? "#16a34a" : "#ef4444"}
                  style={styles.validationIcon}
                />
              )}
            </View>
            {emailTouched && !emailValid && email.length > 0 && (
              <Text style={styles.errorText}>Digite um email válido</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Crie uma senha forte"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View style={[
                    styles.strengthFill,
                    { width: `${(passwordInfo.strength / 5) * 100}%`, backgroundColor: getStrengthColor() }
                  ]} />
                </View>
                <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>{getStrengthLabel()}</Text>
              </View>
            )}
            {password.length > 0 && (
              <View style={styles.checksContainer}>
                <View style={styles.checkRow}>
                  <Ionicons name={passwordInfo.checks.length ? "checkmark-circle" : "ellipse-outline"} size={14} color={passwordInfo.checks.length ? "#16a34a" : "#94a3b8"} />
                  <Text style={[styles.checkText, passwordInfo.checks.length && styles.checkTextValid]}>8+ caracteres</Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name={passwordInfo.checks.uppercase ? "checkmark-circle" : "ellipse-outline"} size={14} color={passwordInfo.checks.uppercase ? "#16a34a" : "#94a3b8"} />
                  <Text style={[styles.checkText, passwordInfo.checks.uppercase && styles.checkTextValid]}>Maiúscula</Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name={passwordInfo.checks.lowercase ? "checkmark-circle" : "ellipse-outline"} size={14} color={passwordInfo.checks.lowercase ? "#16a34a" : "#94a3b8"} />
                  <Text style={[styles.checkText, passwordInfo.checks.lowercase && styles.checkTextValid]}>Minúscula</Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name={passwordInfo.checks.number ? "checkmark-circle" : "ellipse-outline"} size={14} color={passwordInfo.checks.number ? "#16a34a" : "#94a3b8"} />
                  <Text style={[styles.checkText, passwordInfo.checks.number && styles.checkTextValid]}>Número</Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name={passwordInfo.checks.special ? "checkmark-circle" : "ellipse-outline"} size={14} color={passwordInfo.checks.special ? "#16a34a" : "#94a3b8"} />
                  <Text style={[styles.checkText, passwordInfo.checks.special && styles.checkTextValid]}>Especial (!@#$)</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar senha</Text>
            <View style={[
              styles.inputContainer,
              confirmPassword.length > 0 && !passwordsMatch && styles.inputError,
              passwordsMatch && styles.inputSuccess
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Digite a senha novamente"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
              {confirmPassword.length > 0 && (
                <Ionicons
                  name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={passwordsMatch ? "#16a34a" : "#ef4444"}
                  style={styles.validationIcon}
                />
              )}
            </View>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.errorText}>As senhas não coincidem</Text>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister} 
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>Criando conta...</Text>
            ) : (
              <>
                <Text style={styles.buttonText}>Criar conta</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Benefits */}
          <View style={styles.benefits}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.benefitText}>Controle total das suas finanças</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.benefitText}>Assessor IA disponível 24/7</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.benefitText}>Integração com WhatsApp</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}> Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 50
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1e293b',
    marginBottom: 4
  },
  subtitle: { 
    fontSize: 15, 
    color: '#64748b'
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 18
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginLeft: 16
  },
  input: { 
    flex: 1,
    color: '#1e293b', 
    padding: 16, 
    fontSize: 16 
  },
  eyeBtn: {
    padding: 16
  },
  button: { 
    flexDirection: 'row',
    backgroundColor: '#166534', 
    padding: 18, 
    borderRadius: 14, 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: 'bold' 
  },
  benefits: {
    marginTop: 24,
    gap: 12
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  benefitText: {
    color: '#64748b',
    fontSize: 14
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20
  },
  footerText: {
    color: '#64748b',
    fontSize: 15
  },
  loginLink: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '600'
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5
  },
  inputSuccess: {
    borderColor: '#16a34a',
    borderWidth: 1.5
  },
  validationIcon: {
    marginRight: 12
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden'
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80
  },
  checksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  checkText: {
    fontSize: 11,
    color: '#94a3b8'
  },
  checkTextValid: {
    color: '#16a34a'
  }
});
