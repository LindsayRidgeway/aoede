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
  // Android custom picker styles
  androidPickerContainer: {
    flex: 1,
    marginRight: 10
  },
  androidPickerButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  androidPickerButtonText: {
    color: '#999',
    fontSize: 15
  },
  androidPickerButtonTextSelected: {
    color: '#333',
    fontSize: 15
  },
  androidPickerIcon: {
    fontSize: 12,
    color: '#777',
    marginLeft: 8
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
  // Speed Control with Inline Circles
  speedControlRow: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
    color: '#555'
  },
  speedCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  speedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#aaa',
    marginLeft: 5,
    // 3D effect for popped out appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2
  },
  speedCircleActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#3a80d2',
    // 3D effect for pressed in appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    // Slight inset effect
    transform: [{ scale: 0.9 }]
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
  // Next button with spinner styles
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonSpinner: {
    marginRight: 8
  },
  buttonTextWithSpinner: {
    opacity: 0.7
  },
  // Loading notice styles
  loadingNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  loadingSpinner: {
    marginRight: 10
  },
  loadingNoticeText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic'
  }
});