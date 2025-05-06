// readingStyles.js - Styles for the reading controls
import { StyleSheet, Platform } from 'react-native';

// Theme colors
const themeBlue = '#3a7ca5';

export const readingStyles = StyleSheet.create({
  // New: ScrollView content container
  readingScrollContainer: {
    alignItems: 'center',
    paddingBottom: 20, // REDUCED extra space at bottom for scrolling (from 30)
  },
  
  // New: Book title styles
  bookTitleContainer: {
    width: '80%',
    marginVertical: 8, // REDUCED vertical margin (from 10)
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a6c95',
    textAlign: 'center',
  },
  
  // Media Player Style Controls - NEW
  mediaControlsContainer: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // REDUCED bottom margin (from 15)
  },
  mediaButton: {
    backgroundColor: themeBlue,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    // Add subtle shadow
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)'
    } : {}),
    elevation: 2
  },
  mediaButtonCenter: {
    backgroundColor: themeBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
    // Add subtle shadow
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)'
    } : {}),
    elevation: 2
  },
  mediaButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Content container styles
  contentContainer: {
    width: '80%',
    marginTop: 5, // REDUCED top margin (from 10)
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    // No fixed height - allows content to determine size
    minHeight: 100, // Minimum height for empty content
    marginBottom: 8, // REDUCED bottom margin (from 10)
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
    marginBottom: 8 // REDUCED bottom margin (from 10)
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

  // Control buttons (legacy style)
  controlsContainer: {
    width: '80%',
    alignItems: 'flex-start',
    marginTop: 5, // REDUCED top margin (kept at 5)
    marginBottom: 8, // REDUCED bottom margin (from 10)
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
  rewindButton: {
    marginTop: 8, // REDUCED top margin (from 10)
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  rewindButtonText: {
    fontSize: 12, // REDUCED font size (from 14)
    color: '#333'
  },
  
  // Shared button styles
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14, // REDUCED font size (from 16)
  },
  activeButton: {
    backgroundColor: '#d16666', // Reddish color for active state
  },
  disabledButton: {
    backgroundColor: '#a9a9a9', // Gray for disabled state
    opacity: 0.6,
  },

  // Speed control
  speedControlRow: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8, // REDUCED top margin (from 10)
    marginBottom: 10  // REDUCED space after speed control (from 12)
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

  // Toggle controls
  toggleContainer: {
    width: '80%',
    marginTop: 0,
    marginBottom: 5 // Keep at 5
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Platform-specific adjustments
    ...(Platform.OS === 'web' ? {
      // Web-specific adjustments
      height: 22, // REDUCED height (from 24)
      marginVertical: 2 // Keep at 2
    } : {
      height: Platform.OS === 'android' ? 24 : 32, // REDUCED height (from 25/35)
      marginVertical: Platform.OS === 'android' ? 0 : 2 // Keep as is
    })
  },
  toggleLabel: {
    fontSize: 14,
    marginRight: 10,
    color: '#555'
  },

  // Next button with spinner
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
  },
  
  // New: Home link styles
  homeLink: {
    marginTop: 8, // REDUCED top margin (from 15)
    paddingVertical: 6, // REDUCED vertical padding (from 8)
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  homeLinkText: {
    color: themeBlue,
    fontWeight: '500',
    fontSize: 12, // REDUCED font size (from 14)
  }
});