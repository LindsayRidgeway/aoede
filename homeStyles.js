// homeStyles.js - Styles for the home/load panel (Web Only)
import { StyleSheet } from 'react-native';

// Theme colors
const themeBlue = '#3a7ca5';
const themeBurgundy = '#800020';

export const homeStyles = StyleSheet.create({
  // Full-page scrolling and container styles
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingTop: 0,
  },
  innerContainer: {
    alignItems: 'center',
    padding: 20,
  },

  // Header with logo
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  headerLogo: {
    width: 50,
    height: 60,
    marginRight: 15,
  },
  headerLogoFramed: {
    width: 50,
    height: 60,
    marginRight: 15,
    backgroundColor: '#fff',
    padding: 4,
    borderWidth: 1,
    borderColor: themeBlue,
    borderRadius: 4,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: themeBlue,
  },
  headerPronunciation: {
    fontSize: 14,
    color: themeBlue,
    marginTop: -2,
  },

  // Input container styles
  inputContainer: {
    width: '95%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeBlue,
    padding: 15,
    marginBottom: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3
  },

  // Study Language section
  studyLangRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  studyLangLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
    color: '#666'
  },
  studyLangInput: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },

  // Reading Level section
  readingLevelRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  readingLevelLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
    color: '#666'
  },
  readingLevelControls: {
    flexDirection: 'row',
    marginLeft: 0,
    width: '100%',
    justifyContent: 'flex-start'
  },
  readingLevelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  readingLevelButtonActive: {
    backgroundColor: themeBlue,
    borderColor: '#2a6c95'
  },
  readingLevelButtonText: {
    fontSize: 14,
    color: '#555'
  },
  readingLevelButtonTextActive: {
    color: '#fff',
    fontWeight: '500'
  },

  // Two-column table layout
  twoColumnTable: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  leftColumn: {
    width: '70%',
    marginRight: 10,
  },
  rightColumn: {
    width: '25%',
  },

  // Source Material section
  sourceRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 10
  },
  pickerContainer: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  bookPicker: {
    width: '100%',
    height: 40
  },

  // Modal styles for pickers
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    maxHeight: '80%'
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  bookItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  bookItemText: {
    fontSize: 16,
    color: '#333'
  },
  closeButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },

  // Button styles
  libraryButton: {
    backgroundColor: themeBurgundy,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
    padding: 10,
    height: 40
  },
  loadButton: {
    backgroundColor: themeBlue,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 10,
    height: 40
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
    opacity: 0.6
  },
  activeButton: {
    backgroundColor: '#d16666'
  },

  // Utility styles
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
});