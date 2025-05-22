// libraryStyles.js - Styles for the library panel (Web Only)
import { StyleSheet } from 'react-native';

// Theme colors
const themeBurgundy = '#800020';
const themeBlue = '#3a7ca5';

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
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.25)'
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
  
  // Tabs container
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: themeBurgundy,
    backgroundColor: '#f8f8f8',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
  },
  activeTabButtonText: {
    color: themeBurgundy,
    fontWeight: 'bold',
  },
  
  // Search styles
  searchContainer: {
    flex: 1,
    padding: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginRight: 10,
    fontStyle: 'italic',  
  },
  searchButton: {
    backgroundColor: themeBlue,
    paddingHorizontal: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#d9534f',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
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
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)'
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
  bookTitleLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeBlue,
    marginBottom: 3,
    textDecorationLine: 'underline',
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
  // Add button
  addButton: {
    backgroundColor: '#5cb85c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
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
  
  // Empty search results
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});