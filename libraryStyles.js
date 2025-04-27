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
    flex: 1,
    padding: 15,
  },
  
  // Book list
  bookList: {
    paddingBottom: 20,
  },
  bookListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,
    // Subtle shadow
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    } : {}),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)'
    } : {})
  },
  bookInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  bookLanguage: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  // Delete button
  deleteButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  // Empty library state
  emptyLibraryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyLibraryText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});