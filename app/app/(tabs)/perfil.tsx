import { View, Text, StyleSheet } from 'react-native';

export default function Perfil() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>U</Text>
      </View>
      
      <Text style={styles.name}>Usuário</Text>
      <Text style={styles.email}>usuario@email.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
});
