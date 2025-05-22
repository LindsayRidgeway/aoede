// readingStyles.js - Styles for the reading controls (Web Only)
import { StyleSheet } from 'react-native';

// Theme colors
const themeBlue = '#3a7ca5';

export const readingStyles = StyleSheet.create({
  // ScrollView content container
  readingScrollContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  
  // Book title styles
  bookTitleContainer: {
    width: '90%',
    marginVertical: 8,
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a6c95',
    textAlign: 'center',
  },
  
  // Media Player Style Controls
  mediaControlsContainer: {
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaButton: {
    backgroundColor: themeBlue,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
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
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
    elevation: 2
  },
  mediaButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Content container styles
  contentContainer: {
    width: '95%',
    marginTop: 5,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    marginBottom: 8,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2
  },
  navigationContainer: {
    marginBottom: 8,
    width: '95%',
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
    width: '95%',
    alignItems: 'flex-start',
    marginTop: 5,
    marginBottom: 8,
    position: 'relative'
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
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  rewindButtonText: {
    fontSize: 12,
    color: '#333'
  },
  
  // Shared button styles
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeButton: {
    backgroundColor: '#d16666',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
    opacity: 0.6,
  },

  // Position row container
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 10,
    gap: 8,
  },
  
  // Position input field
  positionInput: {
    width: 70,
    height: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 12,
    textAlign: 'center',
    marginLeft: 8,
  },
  
  // Go button
  goButton: {
    backgroundColor: themeBlue,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 40,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
    elevation: 2,
  },
  
  // Go button text
  goButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Speed control
  speedControlRow: {
    width: '95%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10
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
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.2)',
    elevation: 2
  },
  speedCircleActive: {
    backgroundColor: themeBlue,
    borderColor: '#2a6c95',
    boxShadow: '0px 0px 1px rgba(0, 0, 0, 0.1)',
    elevation: 1,
    transform: [{ scale: 0.9 }]
  },

  // Toggle controls
  toggleContainer: {
    width: '95%',
    marginTop: 0,
    marginBottom: 5
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 38,
    transition: 'all 0.2s ease',
  },
  focusedToggleItem: {
    backgroundColor: 'rgba(58, 124, 165, 0.15)',
    borderColor: '#3a7ca5',
    boxShadow: '0 0 8px rgba(58, 124, 165, 0.8)'
  },
  toggleLabel: {
    fontSize: 14,
    marginRight: 10,
    color: '#555',
    flex: 1,
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
  
  // Home link styles
  homeLink: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  homeLinkText: {
    color: themeBlue,
    fontWeight: '500',
    fontSize: 12,
  },

  // Focused element styles
  focusedElement: {
    outlineWidth: '3px',
    outlineStyle: 'solid',
    outlineColor: themeBlue,
    borderColor: themeBlue,
    backgroundColor: 'rgba(58, 124, 165, 0.15)',
    boxShadow: '0 0 10px rgba(58, 124, 165, 0.8)',
  }
});