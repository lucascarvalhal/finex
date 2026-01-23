import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      <Text style={[styles.bubbleText, item.isUser && { color: '#fff' }]}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
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
          <ActivityIndicator size="small" color="#10b981" />
          <Text style={styles.loadingText}>Analisando...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Pergunte sobre suas finanças..."
          placeholderTextColor="#64748b"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, (!inputText.trim() || isLoading) && { opacity: 0.5 }]} onPress={sendMessage} disabled={!inputText.trim() || isLoading}>
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  list: { padding: 15, paddingBottom: 5 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  userBubble: { backgroundColor: '#10b981', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#e2e8f0', lineHeight: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8 },
  loadingText: { marginLeft: 8, color: '#64748b', fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#1e293b', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#0f172a', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: '#10b981', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 10 },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
