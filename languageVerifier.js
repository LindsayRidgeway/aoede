// languageVerifier.js - Verifies language names against Google's supported languages
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API key using the same approach as other files
const getConstantValue = (key) => {
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  return null;
};

// Get API key from Expo Constants
const GOOGLE_API_KEY = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');

// Cache storage key for language data
const LANGUAGE_CACHE_KEY = 'google_translate_languages';
const LANGUAGE_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Store for available languages
let languageData = null;
let languageNames = null;
let languageCodes = null;
let lastFetchTime = 0;

// Fetch the list of supported languages from Google Translate API
export const fetchSupportedLanguages = async (forceRefresh = false) => {
  // Check if we have cached data and it's not expired
  if (!forceRefresh && languageData) {
    return languageData;
  }
  
  try {
    // Try to get from cache first
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(LANGUAGE_CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        // If cache is still valid, use it
        if (now - timestamp < LANGUAGE_CACHE_EXPIRY) {
          console.log('[LanguageVerifier] Using cached language data');
          languageData = data;
          processLanguageData(data);
          return data;
        }
      }
    }
    
    // No valid cache, fetch from API
    if (!GOOGLE_API_KEY) {
      console.log('[LanguageVerifier] No Google API key available');
      return null;
    }
    
    // Get user's system language for localized language names
    const userLang = typeof navigator !== 'undefined' && navigator.language
      ? navigator.language.split('-')[0]
      : 'en';
    
    console.log(`[LanguageVerifier] Fetching supported languages (localized in ${userLang})`);
    
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_API_KEY}&target=${userLang}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.log(`[LanguageVerifier] API error: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    
    if (!result.data || !result.data.languages) {
      console.log('[LanguageVerifier] Invalid API response format');
      return null;
    }
    
    // Save to memory and cache
    languageData = result.data.languages;
    processLanguageData(languageData);
    
    // Save to cache with timestamp
    const cacheData = {
      data: languageData,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(LANGUAGE_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`[LanguageVerifier] Cached ${languageData.length} languages`);
    
    return languageData;
  } catch (error) {
    console.log(`[LanguageVerifier] Error fetching languages: ${error.message}`);
    return null;
  }
};

// Process language data into lookup maps
const processLanguageData = (languages) => {
  if (!languages || !Array.isArray(languages)) return;
  
  // Create maps for quick lookups
  languageNames = new Map();
  languageCodes = new Map();
  
  languages.forEach(lang => {
    if (lang.language && lang.name) {
      // Store normalized language name → code
      languageNames.set(lang.name.toLowerCase().trim(), lang.language);
      
      // Store code → language name
      languageCodes.set(lang.language, lang.name);
    }
  });
  
  console.log(`[LanguageVerifier] Processed ${languages.length} languages`);
};

// Verify if a language name is supported and get its code
export const verifyLanguage = async (languageName) => {
  if (!languageName) return { valid: false, code: 'auto' };
  
  // Normalize input
  const normalizedName = languageName.toLowerCase().trim();
  
  // If it looks like a language code already (e.g., "en", "fr", "zh-CN")
  if (/^[a-z]{2}(-[a-z]{2,3})?$/i.test(normalizedName)) {
    return { valid: true, code: normalizedName, name: normalizedName };
  }
  
  // Ensure we have language data
  if (!languageData) {
    await fetchSupportedLanguages();
  }
  
  // Look for exact match in our processed language names
  if (languageNames && languageNames.has(normalizedName)) {
    const code = languageNames.get(normalizedName);
    return { 
      valid: true, 
      code, 
      name: languageCodes.get(code) || normalizedName
    };
  }
  
  // Look for partial matches if no exact match
  if (languageNames) {
    for (const [name, code] of languageNames.entries()) {
      // Check if the language name contains our search term
      if (name.includes(normalizedName) || normalizedName.includes(name)) {
        return { 
          valid: true, 
          code, 
          name: languageCodes.get(code) || name,
          partial: true 
        };
      }
    }
  }
  
  // If we have language data but couldn't find a match, it's invalid
  if (languageData) {
    return { valid: false, code: 'auto', name: normalizedName };
  }
  
  // If we couldn't load language data, default to auto
  return { valid: null, code: 'auto', name: normalizedName };
};

// Get the full display name for a language code
export const getLanguageNameFromCode = async (code) => {
  if (!code) return null;
  
  // Ensure we have language data
  if (!languageData) {
    await fetchSupportedLanguages();
  }
  
  if (languageCodes && languageCodes.has(code)) {
    return languageCodes.get(code);
  }
  
  return null;
};

// Initialize verifier
export const initialize = async () => {
  console.log('[LanguageVerifier] Initializing...');
  await fetchSupportedLanguages();
};

// Utility function to get the most accurate language code
export const getLanguageCode = async (languageName) => {
  const result = await verifyLanguage(languageName);
  return result.code;
};

export default {
  initialize,
  fetchSupportedLanguages,
  verifyLanguage,
  getLanguageCode,
  getLanguageNameFromCode
};