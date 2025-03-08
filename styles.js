import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
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
  studyLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  // New styles for Search Mode
  searchModeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10
  },
  searchModeToggle: {
    padding: 6,
    backgroundColor: '#e8f4fd',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bde0fd'
  },
  searchModeText: {
    fontSize: 12,
    color: '#4a90e2'
  },
  // Styles for free-form search
  bookSearchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  searchInputContainer: {
    flex: 1,
    marginRight: 10
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },
  // Reading Level styles
  readingLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  readingLevelControls: {
    flexDirection: 'row',
    marginLeft: 10
  },
  readingLevelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  readingLevelButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#3a80d2'
  },
  readingLevelButtonText: {
    fontSize: 14,
    color: '#555'
  },
  readingLevelButtonTextActive: {
    color: '#fff',
    fontWeight: '500'
  },
  bookSelectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  pickerContainer: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  bookPicker: {
    width: '100%',
    height: 40
  },
  sourceInputWrapper: {
    flex: 1,
    marginRight: 10
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555'
  },
  smallLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    marginRight: 10,
    color: '#555'
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },
  studyLangInput: {
    width: 120,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
    width: '100%'
  },
  loadButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    height: 40
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
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  navigationContainer: {
    marginBottom: 10
  },
  sentenceCounter: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 5
  },
  navigationSlider: {
    width: '100%',
    height: 30
  },
  sentenceWrapper: {
    marginBottom: 8
  },
  translationWrapper: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  soloTranslationWrapper: {
    // No top border when translation is alone
  },
  foreignSentence: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#444'
  },
  translation: {
    fontSize: 16,
    color: '#333'
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
    justifyContent: 'center',
    width: '45%'
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
  },
  // Loading indicator styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginLeft: 5,
    fontSize: 14
  }
});