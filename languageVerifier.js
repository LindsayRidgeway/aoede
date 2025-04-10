// languageVerifier.js - Handles language validation and supported language fetching
import Constants from 'expo-constants';
import { detectLanguageCode } from './textProcessing';

// Debug flag - set to false to disable debug logging
const DEBUG = false;

// Helper for debug logging
const log = (message) => {
  if (DEBUG) {
    console.log(`[LanguageVerifier] ${message}`);
  }
};

// Get API key using helper function for consistency
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

// Get Google API key for translations
const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');

// Cache of supported languages to avoid multiple API calls
let cachedLanguages = null;

// Flag to track if a fetch is in progress
let isFetchingLanguages = false;

// Common language codes for faster access
const commonLanguages = [
  { language: 'af', name: 'Afrikaans' },
  { language: 'ar', name: 'Arabic' },
  { language: 'bg', name: 'Bulgarian' },
  { language: 'bn', name: 'Bengali' },
  { language: 'ca', name: 'Catalan' },
  { language: 'cs', name: 'Czech' },
  { language: 'cy', name: 'Welsh' },
  { language: 'da', name: 'Danish' },
  { language: 'de', name: 'German' },
  { language: 'el', name: 'Greek' },
  { language: 'en', name: 'English' },
  { language: 'es', name: 'Spanish' },
  { language: 'et', name: 'Estonian' },
  { language: 'fa', name: 'Persian' },
  { language: 'fi', name: 'Finnish' },
  { language: 'fr', name: 'French' },
  { language: 'gu', name: 'Gujarati' },
  { language: 'he', name: 'Hebrew' },
  { language: 'hi', name: 'Hindi' },
  { language: 'hr', name: 'Croatian' },
  { language: 'hu', name: 'Hungarian' },
  { language: 'id', name: 'Indonesian' },
  { language: 'it', name: 'Italian' },
  { language: 'ja', name: 'Japanese' },
  { language: 'ko', name: 'Korean' },
  { language: 'lt', name: 'Lithuanian' },
  { language: 'lv', name: 'Latvian' },
  { language: 'ms', name: 'Malay' },
  { language: 'nl', name: 'Dutch' },
  { language: 'no', name: 'Norwegian' },
  { language: 'pl', name: 'Polish' },
  { language: 'pt', name: 'Portuguese' },
  { language: 'ro', name: 'Romanian' },
  { language: 'ru', name: 'Russian' },
  { language: 'sk', name: 'Slovak' },
  { language: 'sl', name: 'Slovenian' },
  { language: 'sr', name: 'Serbian' },
  { language: 'sv', name: 'Swedish' },
  { language: 'sw', name: 'Swahili' },
  { language: 'ta', name: 'Tamil' },
  { language: 'te', name: 'Telugu' },
  { language: 'th', name: 'Thai' },
  { language: 'tr', name: 'Turkish' },
  { language: 'uk', name: 'Ukrainian' },
  { language: 'ur', name: 'Urdu' },
  { language: 'vi', name: 'Vietnamese' },
  { language: 'zh', name: 'Chinese' }
];

const LanguageVerifier = {
  /**
   * Fetch supported languages from Google Translate API
   * Returns Promise but designed for callback-style use
   */
  fetchSupportedLanguages: () => {
    // Return cached languages if available
    if (cachedLanguages) {
      log('Using cached languages list');
      return Promise.resolve(cachedLanguages);
    }
    
    // If already fetching, return the common languages
    if (isFetchingLanguages) {
      log('Already fetching languages, using common languages');
      return Promise.resolve(commonLanguages);
    }
    
    // Start a fetch in the background but return immediately with common languages
    isFetchingLanguages = true;
    
    // Start the fetch, but don't wait for it
    fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_API_KEY}&target=en`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.data && data.data.languages) {
        // Format the languages into a more usable structure
        const languages = data.data.languages.map(lang => ({
          language: lang.language, // ISO code (e.g., 'en', 'es')
          name: lang.name       // Display name (e.g., 'English', 'Spanish')
        }));
        
        // Cache the languages for future use
        cachedLanguages = languages;
        log(`Fetched ${languages.length} supported languages`);
      }
    })
    .catch(error => {
      log(`Error fetching languages: ${error.message}`);
    })
    .finally(() => {
      isFetchingLanguages = false;
    });
    
    // Return common languages immediately
    return Promise.resolve(commonLanguages);
  },
  
  /**
   * Verify if a language code is supported
   * Synchronous version that uses only cached data or common languages
   */
  verifyLanguageCode: (languageCode) => {
    if (!languageCode) return false;
    
    // Normalize language code
    const normalizedCode = languageCode.toLowerCase().trim();
    
    // Check if the language code is in the cached supported languages
    if (cachedLanguages) {
      return cachedLanguages.some(lang => lang.language.toLowerCase() === normalizedCode);
    }
    
    // Fall back to common languages
    return commonLanguages.some(lang => lang.language.toLowerCase() === normalizedCode);
  },
  
  /**
   * Get the language name for a language code
   * Synchronous version that uses only cached data or common languages
   */
  getLanguageName: (languageCode) => {
    if (!languageCode) return '';
    
    // Normalize language code
    const normalizedCode = languageCode.toLowerCase().trim();
    
    // Check cached languages
    if (cachedLanguages) {
      const language = cachedLanguages.find(lang => lang.language.toLowerCase() === normalizedCode);
      if (language) {
        return language.name;
      }
    }
    
    // Fall back to common languages
    const commonLanguage = commonLanguages.find(lang => lang.language.toLowerCase() === normalizedCode);
    return commonLanguage ? commonLanguage.name : languageCode;
  },
  
  /**
   * Get the language code for a language name
   * Synchronous version that uses only cached data or common languages
   */
  getLanguageCode: (languageName) => {
    if (!languageName) return '';
    
    // Normalize language name
    const normalizedName = languageName.toLowerCase().trim();
    
    // Check cached languages
    if (cachedLanguages) {
      // First, try exact match
      let language = cachedLanguages.find(lang => 
        lang.name.toLowerCase() === normalizedName
      );
      
      // If not found, try partial match
      if (!language) {
        language = cachedLanguages.find(lang => 
          lang.name.toLowerCase().includes(normalizedName) || 
          normalizedName.includes(lang.name.toLowerCase())
        );
      }
      
      if (language) {
        return language.language;
      }
    }
    
    // Fall back to common languages
    const exactMatch = commonLanguages.find(lang => 
      lang.name.toLowerCase() === normalizedName
    );
    
    if (exactMatch) {
      return exactMatch.language;
    }
    
    // Try partial match with common languages
    const partialMatch = commonLanguages.find(lang => 
      lang.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(lang.name.toLowerCase())
    );
    
    return partialMatch ? partialMatch.language : '';
  }
};

// Start fetching languages in the background
LanguageVerifier.fetchSupportedLanguages();

export default LanguageVerifier;