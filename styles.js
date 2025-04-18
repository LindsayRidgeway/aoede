import { StyleSheet, Platform } from 'react-native';

// Different top padding based on platform
const topPadding = Platform.OS === 'android' ? 50 : 0;

// Theme colors
const themeBlue = '#3a7ca5';

export const styles = StyleSheet.create({
  // New styles for full-page scrolling
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
  // Platform-specific framed logo style
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
  // Original styles
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
  inputContainer: {
    width: '80%',
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
  // Redesigned study language and reading level
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
  // Reading Level styles
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
  bookSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...(Platform.OS === 'android' ? {
      alignItems: 'center', // Center alignment for Android
    } : {
      alignItems: 'flex-end' // Original alignment for other platforms
    })
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    ...(Platform.OS === 'android' ? {
      marginBottom: 0 // No bottom margin for Android
    } : {})
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
  // Modal styles for Android book picker
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
  button: {
    backgroundColor: themeBlue,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
    width: '100%'
  },
  loadButton: {
    backgroundColor: themeBlue,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    // Platform-specific adjustments
    ...(Platform.OS === 'android' 
      ? {
          // Android needs a bit more vertical space
          paddingVertical: 12, 
          paddingHorizontal: 10,
          // Remove fixed height on Android
          height: undefined,
          // Add a bit of bottom margin to counteract text clipping
          marginBottom: 2
        } 
      : {
          // Keep existing style for iOS/Web
          padding: 10,
          height: 40
        }
    )
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    // Fix vertical text alignment on Android
    ...(Platform.OS === 'android' 
      ? {
          includeFontPadding: false,
          textAlignVertical: 'center'
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
  // Updated content container for flexible sizing
  contentContainer: {
    width: '80%',
    marginTop: 5,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    // No fixed height - allows content to determine size
    minHeight: 100, // Minimum height for empty content
    marginBottom: 10,
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)'
    } : {}),
    elevation: 2
  },
  navigationContainer: {
    marginBottom: 10
  },
  sentenceWrapper: {
    marginBottom: 12
  },
  translationWrapper: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  soloTranslationWrapper: {
    // No top border when translation is alone
  },
  foreignSentence: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#2a6c95',
    lineHeight: 26
  },
  translation: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24
  },
  controlsContainer: {
    width: '80%',
    alignItems: 'flex-start',
    marginBottom: 2,
    position: 'relative'  // For positioning the rewind button
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5
  },
  controlButton: {
    backgroundColor: themeBlue,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%'
  },
  // Updated rewind button to be consistent across platforms
  rewindButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  rewindButtonText: {
    fontSize: 14,
    color: '#333'
  },
  // Speed Control with Inline Circles
  speedControlRow: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12  // Increased space after speed control
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#aaa',
    marginLeft: 5,
    // 3D effect for popped out appearance
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.2)'
    } : {}),
    elevation: 2
  },
  speedCircleActive: {
    backgroundColor: themeBlue,
    borderColor: '#2a6c95',
    // 3D effect for pressed in appearance
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 0px 1px rgba(0, 0, 0, 0.1)'
    } : {}),
    elevation: 1,
    // Slight inset effect
    transform: [{ scale: 0.9 }]
  },
  toggleContainer: {
    width: '80%',
    marginTop: 0,
    marginBottom: 5
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Platform-specific heights to fix vertical spacing in web
    ...(Platform.OS === 'web' ? {
      height: 24, // Reduced height for web
      marginVertical: 2 // Small vertical margin for web
    } : {
      height: Platform.OS === 'android' ? 25 : 35, // Original heights for native
      marginVertical: Platform.OS === 'android' ? 0 : 2 // Original margins for native
    })
  },
  toggleLabel: {
    fontSize: 14,
    marginRight: 10,
    color: '#555'
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
