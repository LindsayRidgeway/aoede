// homeStyles.js - Styles for the home/load panel
import { StyleSheet, Platform } from 'react-native';

// Theme colors
const themeBlue = '#3a7ca5';
const themeBurgundy = '#800020'; // Burgundy color for Library features

// Different top padding based on platform
const topPadding = Platform.OS === 'android' ? 50 : 0;

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
    paddingBottom: 30, // Extra padding at the bottom for scrolling
    paddingTop: topPadding, // Platform-specific top padding
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
    // Simple thin border for all platforms
    borderWidth: 1,
    borderColor: themeBlue,
    borderRadius: 4,
    // Remove shadow/elevation for clean look
    ...(Platform.OS === 'android' || Platform.OS === 'ios' ? {
      elevation: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    } : {}),
    // For Web - use boxShadow none to ensure no shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none'
    } : {})
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
    // Make container wider on mobile (90% vs 80% on web)
    width: Platform.OS === 'web' ? '80%' : '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeBlue,
    padding: 15,
    marginBottom: 10,
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
    } : {}),
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
    marginLeft: 0, // Align with left edge
    width: '100%', // Use full width
    justifyContent: 'flex-start' // Left justify
  },
  readingLevelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 10, // More space between buttons
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
    alignItems: 'flex-end' // Align items at the bottom
  },
  leftColumn: {
    // Adjust width based on platform
    width: Platform.OS === 'web' ? '70%' : '65%', // Narrower on mobile
    marginRight: 10,
  },
  rightColumn: {
    // Adjust width based on platform
    width: Platform.OS === 'web' ? '25%' : '30%', // Wider on mobile
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

  // Android picker styles
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
    // Platform-specific adjustments
    ...(Platform.OS === 'android' || Platform.OS === 'ios'
      ? {
          // Mobile specific adjustments
          height: 'auto',
          minHeight: 40,
          paddingVertical: 5,
          paddingHorizontal: 8,
        } 
      : {
          // Keep existing style for Web
          padding: 10,
          height: 40
        }
    )
  },
  loadButton: {
    backgroundColor: themeBlue,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    // Platform-specific adjustments
    ...(Platform.OS === 'android' || Platform.OS === 'ios'
      ? {
          // Mobile specific adjustments
          height: 'auto',
          minHeight: 40,
          paddingVertical: 5,
          paddingHorizontal: 8,
        } 
      : {
          // Keep existing style for Web
          padding: 10,
          height: 40
        }
    )
  },
  buttonText: {
    color: '#fff',
    // Smaller font size for mobile
    fontSize: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 12 : 10,
    fontWeight: 'bold',
    // Fix text alignment on mobile and allow wrapping
    textAlign: 'center',
    ...(Platform.OS === 'android' || Platform.OS === 'ios'
      ? {
          includeFontPadding: false,
          textAlignVertical: 'center',
        } 
      : {}
    )
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