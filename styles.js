import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  input: {
    width: '40%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 10
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  disabledButton: {  // ✅ New style for disabled buttons
    backgroundColor: '#A9A9A9',  // Dimmed gray
    opacity: 0.6
  }
});