import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function AssessorScreen() {
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
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color="#166534" />
        </View>
      )}
      <View style={[styles.bubbleContent, item.isUser && styles.userBubbleContent]}>
        <Text style={[styles.bubbleText, item.isUser && styles.userBubbleText]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={24} color="#166534" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Assessor Financeiro</Text>
          <Text style={styles.headerSubtitle}>Powered by Gemini AI</Text>
        </View>
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
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#166534" />
          <Text style={styles.loadingText}>Analisando...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Pergunte sobre suas finanças..."
          placeholderTextColor="#94a3b8"
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },
  headerIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#dcfce7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  headerTitle: { color: '#1e293b', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#dcfce7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8,
    marginTop: 4
  },
  bubbleContent: { 
    backgroundColor: '#fff', 
    padding: 14, 
    borderRadius: 18, 
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1
  },
  userBubbleContent: { 
    backgroundColor: '#166534', 
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderColor: '#166534'
  },
  bubbleText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  userBubbleText: { color: '#fff' },
  loading: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8
  },
  loadingText: { marginLeft: 8, color: '#64748b', fontSize: 14 },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#fff', 
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    color: '#1e293b', 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    fontSize: 15, 
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sendBtn: { 
    backgroundColor: '#166534', 
    borderRadius: 24, 
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10 
  },
  sendBtnDisabled: { opacity: 0.5 },
});
