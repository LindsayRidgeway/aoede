// userLibrary.js - Manages user's custom book library in AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookSources as defaultBookSources } from './bookSources';

// Storage keys for the user's custom library
const USER_LIBRARY_KEY = 'user_library';
const USER_LIBRARY_INITIALIZED_KEY = 'user_library_initialized';

// Initialize the user's library
export const initializeUserLibrary = async () => {
  try {
    // Check if library has been initialized before
    const initialized = await AsyncStorage.getItem(USER_LIBRARY_INITIALIZED_KEY);
    
    if (initialized !== 'true') {
      // If not initialized, create library with default books
      await AsyncStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(defaultBookSources));
      // Mark as initialized
      await AsyncStorage.setItem(USER_LIBRARY_INITIALIZED_KEY, 'true');
      if (__DEV__) console.log("User library initialized with default books");
      return true;
    }
    
    // If already initialized, check if library exists
    const existingLibrary = await AsyncStorage.getItem(USER_LIBRARY_KEY);
    
    if (existingLibrary === null) {
      // Library was initialized before but is missing (could happen due to storage issues)
      // Recreate it with default books
      await AsyncStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(defaultBookSources));
      if (__DEV__) console.log("User library recreated with default books");
    }
    
    return true;
  } catch (error) {
    if (__DEV__) console.log(`Error initializing user library: ${error.message}`);
    return false;
  }
};

// Get the user's library
export const getUserLibrary = async () => {
  try {
    // Check if library has been initialized
    const initialized = await AsyncStorage.getItem(USER_LIBRARY_INITIALIZED_KEY);
    
    if (initialized !== 'true') {
      // If not initialized, initialize it first
      await initializeUserLibrary();
    }
    
    const libraryJson = await AsyncStorage.getItem(USER_LIBRARY_KEY);
    
    if (libraryJson === null) {
      // If library doesn't exist or is null, return an empty array
      // This indicates an empty library (all books deleted) not an uninitialized one
      return [];
    }
    
    return JSON.parse(libraryJson);
  } catch (error) {
    if (__DEV__) console.log(`Error getting user library: ${error.message}`);
    return []; // Return empty array on error
  }
};

// Reset library to default books
export const resetLibraryToDefault = async () => {
  try {
    await AsyncStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(defaultBookSources));
    return true;
  } catch (error) {
    if (__DEV__) console.log(`Error resetting library: ${error.message}`);
    return false;
  }
};

// Check if the library has been initialized
export const isLibraryInitialized = async () => {
  try {
    const initialized = await AsyncStorage.getItem(USER_LIBRARY_INITIALIZED_KEY);
    return initialized === 'true';
  } catch (error) {
    if (__DEV__) console.log(`Error checking library initialization: ${error.message}`);
    return false;
  }
};

// Get a book from the user's library by ID
export const getBookById = async (bookId) => {
  try {
    const library = await getUserLibrary();
    return library.find(book => book.id === bookId) || null;
  } catch (error) {
    if (__DEV__) console.log(`Error getting book by ID: ${error.message}`);
    return null;
  }
};

// Add a book to the user's library
export const addBookToLibrary = async (book) => {
  try {
    const library = await getUserLibrary();
    
    // Check if book with this ID already exists
    const existingIndex = library.findIndex(b => b.id === book.id);
    
    if (existingIndex >= 0) {
      // Replace existing book
      library[existingIndex] = book;
    } else {
      // Add new book
      library.push(book);
    }
    
    await AsyncStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(library));
    return true;
  } catch (error) {
    if (__DEV__) console.log(`Error adding book to library: ${error.message}`);
    return false;
  }
};

// Remove a book from the user's library
export const removeBookFromLibrary = async (bookId) => {
  try {
    const library = await getUserLibrary();
    
    // Check if the book exists
    const bookExists = library.some(book => book.id === bookId);
    if (!bookExists) {
      return false;
    }
    
    const updatedLibrary = library.filter(book => book.id !== bookId);
    
    await AsyncStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(updatedLibrary));
    return true;
  } catch (error) {
    console.error(`Error removing book from library: ${error.message}`);
    return false;
  }
};

// Check if a book exists in the library
export const bookExistsInLibrary = async (bookId) => {
  try {
    const library = await getUserLibrary();
    return library.some(book => book.id === bookId);
  } catch (error) {
    if (__DEV__) console.log(`Error checking book existence: ${error.message}`);
    return false;
  }
};

// Get popular books (currently just returns all books, but could be modified later)
export const getPopularBooks = async () => {
  try {
    const library = await getUserLibrary();
    
    // If library is empty, return default books as suggestions
    if (library.length === 0) {
      return defaultBookSources.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author
      }));
    }
    
    // Transform to match the format of popularBooks in bookSources.js
    return library.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author
    }));
  } catch (error) {
    if (__DEV__) console.log(`Error getting popular books: ${error.message}`);
    return [];
  }
};

// Get default books
export const getDefaultBooks = () => {
  return defaultBookSources;
};

// Validate a URL
export const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};