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
    marginBottom: 15,
    color: '#333'
  },
  inputContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a90e2',
    padding: 15,
    marginBottom: 10,
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
    opacity: 0.6
  },
  activeButton: {
    backgroundColor: '#e24a4a'
  },
  contentContainer: {
    width: '80%',
    marginTop: 5
  },
  sentence: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 5
  },
  translation: {
    fontSize: 16
  },
  controlsContainer: {
    width: '80%',
    alignItems: 'flex-start',
    marginBottom: 2
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5
  },
  controlButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '30%'
  },
  speedControlContainer: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 2
  },
  speedLabel: {
    fontSize: 12,
    marginRight: 10,
    color: '#555'
  },
  speedSlider: {
    width: 120,
    height: 30
  },
  toggleContainer: {
    width: '80%',
    marginTop: 0
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3
  },
  toggleLabel: {
    fontSize: 14,
    marginRight: 10
  }
});