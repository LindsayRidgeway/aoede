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
    marginBottom: 20,
    color: '#333'
  },
  inputContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a90e2',
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555'
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 15
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
    width: '100%'
  },
  controlButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '48%'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
    opacity: 0.6
  },
  sentenceContainer: {
    width: '80%',
    marginTop: 10,
    padding: 10
  },
  sentence: {
    fontSize: 18,
    marginBottom: 10
  },
  translation: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 10
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 10
  },
  toggleContainer: {
    marginTop: 20,
    width: '80%'
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  toggleLabel: {
    fontSize: 16
  },
  sliderContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 10
  }
});