// libraryStyles.js - Styles for the library panel
import { StyleSheet, Platform } from 'react-native';

// Theme colors
const themeBurgundy = '#800020'; // Burgundy color for Library features

export const libraryStyles = StyleSheet.create({
  // Library modal container
  libraryModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Library content wrapper
  libraryContentWrapper: {
    flex: 1,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    // Platform-specific shadow
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.25)'
    } : {})
  },
  // Library content scrollview
  libraryScrollView: {
    flex: 1,
  },
  // Library header
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  libraryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeBurgundy,
  },
  // Exit button
  exitButton: {
    backgroundColor: themeBurgundy,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  exitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Library content area
  libraryContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding at bottom for scrolling
  },
});