import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = 'http://localhost:8000';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function AssessorScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Olá! Sou seu assessor financeiro. Como posso te ajudar hoje? 💰', isUser: false },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), text: inputText.trim(), isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMessage.text }),
      });

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Desculpe, não consegui processar sua mensagem.',
        isUser: false,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: 'Erro ao conectar. Tente novamente.', isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
      {!item.isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.successLight }]}>
          <Ionicons name="sparkles" size={16} color={colors.success} />
        </View>
      )}
      <View style={[styles.bubbleContent, { backgroundColor: colors.card, borderColor: colors.border }, item.isUser && styles.userBubbleContent]}>
        <Text style={[styles.bubbleText, { color: colors.text }, item.isUser && styles.userBubbleText]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.successLight }]}>
          <Ionicons name="sparkles" size={24} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Assessor Financeiro</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Powered by Gemini AI</Text>
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

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isLoading && (
        <View style={[styles.loading, { backgroundColor: colors.inputBg }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analisando...</Text>
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Pergunte sobre suas finanças..."
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubbleContent: {
    padding: 14,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  userBubbleContent: {
    backgroundColor: '#166534',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderColor: '#166534',
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#fff' },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  loadingText: { marginLeft: 8, fontSize: 14 },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    backgroundColor: '#166534',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
});
