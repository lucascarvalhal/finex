import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8000';

export default function TransacoesScreen() {
  const [transacoes, setTransacoes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('despesa');

  const fetchTransacoes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransacoes(data);
      }
    } catch (error) {
      console.log('Erro ao buscar transações');
    }
  };

  useEffect(() => { fetchTransacoes(); }, []);

  const addTransacao = async () => {
    if (!descricao || !valor) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ descricao, valor: parseFloat(valor), tipo, categoria: 'Geral' }),
      });
      if (response.ok) {
        setModalVisible(false);
        setDescricao('');
        setValor('');
        fetchTransacoes();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View>
        <Text style={styles.itemDesc}>{item.descricao}</Text>
        <Text style={styles.itemCat}>{item.categoria}</Text>
      </View>
      <Text style={[styles.itemValor, { color: item.tipo === 'receita' ? '#10b981' : '#ef4444' }]}>
        {item.tipo === 'receita' ? '+' : '-'} R$ {item.valor?.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList data={transacoes} renderItem={renderItem} keyExtractor={(item) => item.id?.toString()} />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Transação</Text>
            <TextInput style={styles.input} placeholder="Descrição" placeholderTextColor="#666" value={descricao} onChangeText={setDescricao} />
            <TextInput style={styles.input} placeholder="Valor" placeholderTextColor="#666" value={valor} onChangeText={setValor} keyboardType="numeric" />
            <View style={styles.tipoContainer}>
              <TouchableOpacity style={[styles.tipoBtn, tipo === 'despesa' && styles.tipoBtnActive]} onPress={() => setTipo('despesa')}>
                <Text style={styles.tipoText}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tipoBtn, tipo === 'receita' && styles.tipoBtnActiveGreen]} onPress={() => setTipo('receita')}>
                <Text style={styles.tipoText}>Receita</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={addTransacao}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  itemDesc: { color: '#fff', fontSize: 16 },
  itemCat: { color: '#64748b', fontSize: 12 },
  itemValor: { fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#10b981', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  tipoContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  tipoBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
  tipoBtnActive: { backgroundColor: '#ef4444' },
  tipoBtnActiveGreen: { backgroundColor: '#10b981' },
  tipoText: { color: '#fff', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#64748b', textAlign: 'center', marginTop: 15 },
});
