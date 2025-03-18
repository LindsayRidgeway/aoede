// GPT-based book content retrieval service
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Number of sentences to request
const DEFAULT_SENTENCE_COUNT = 500; // Significantly increased to get many more sentences

// Get API key using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

// Get API keys from Expo Constants
const OPENAI_API_KEY = getConstantValue('EXPO_PUBLIC_OPENAI_API_KEY');
const CORS_PROXY = getConstantValue('EXPO_PUBLIC_CORS_PROXY') || "https://thingproxy.freeboard.io/fetch/";

// Import the book cache manager
import BookCacheManager from './bookCache';

// Function to fetch book content by ID (from dropdown) or by custom search
export const fetchBookContent = async (bookIdOrSearch, sentenceCount = DEFAULT_SENTENCE_COUNT, isCustomSearch = false) => {
  let searchQuery;
  let bookId = null;
  
  if (isCustomSearch) {
    // Use the provided text directly as search query
    searchQuery = bookIdOrSearch;
  } else {
    // This is a predefined book, check the cache first
    bookId = bookI
