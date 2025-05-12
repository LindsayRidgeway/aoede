// languageVerifier.js - Handles language validation and supported language fetching
import Constants from 'expo-constants';
import { detectLanguageCode } from './textProcessing';
import { apiGetSupportedLanguages } from './apiServices';

// Common language codes for faster access (fallback if API fails)
const commonLanguages = [
  // Note: This array is kept but commented out to preserve the structure
  /*
  { language: 'af', name: 'Afrikaans' },
  { language: 'ar', name: 'Arabic' },
  // ... other languages
  */
];

const LanguageVerifier = {
  /**
   * Fetch supported languages from Google Translate API
   * Using the centralized apiGetSupportedLanguages function
   */
  fetchSupportedLanguages: async (targetLanguage = 'en') => {
    if (__DEV__) console.log("MODULE 0085: languageVerifier.fetchSupportedLanguages");
    
    try {
      // Use the centralized API function 
      const languages = await apiGetSupportedLanguages(targetLanguage);
      
      if (languages && languages.length > 0) {
        return languages;
      }
      
      // Fallback to common languages if API call fails
      return commonLanguages;
    } catch (error) {
      if (__DEV__) console.log(`Error fetching languages: ${error.message}`);
      return commonLanguages;
    }
  },
  
  /**
   * Verify if a language code is supported
   * Synchronous version that uses only cached data or common languages
   */
  verifyLanguageCode: async (languageCode) => {
    if (__DEV__) console.log("MODULE 0086: languageVerifier.verifyLanguageCode");
    if (!languageCode) return false;
    
    // Normalize language code
    const normalizedCode = languageCode.toLowerCase().trim();
    
    // Get languages using the centralized function
    const languages = await apiGetSupportedLanguages();
    
    if (languages && languages.length > 0) {
      return languages.some(lang => lang.language.toLowerCase() === normalizedCode);
    }
    
    // Fall back to common languages
    return commonLanguages.some(lang => lang.language.toLowerCase() === normalizedCode);
  },
  
  /**
   * Get the language name for a language code
   */
  getLanguageName: async (languageCode) => {
    if (__DEV__) console.log("MODULE 0087: languageVerifier.getLanguageName");
    if (!languageCode) return '';
    
    // Normalize language code
    const normalizedCode = languageCode.toLowerCase().trim();
    
    // Get languages using the centralized function
    const languages = await apiGetSupportedLanguages();
    
    if (languages && languages.length > 0) {
      const language = languages.find(lang => lang.language.toLowerCase() === normalizedCode);
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
   */
  getLanguageCode: async (languageName) => {
    if (__DEV__) console.log("MODULE 0088: languageVerifier.getLanguageCode");
    if (!languageName) return '';
    
    // Normalize language name
    const normalizedName = languageName.toLowerCase().trim();
    
    // Get languages using the centralized function
    const languages = await apiGetSupportedLanguages();
    
    if (languages && languages.length > 0) {
      // First, try exact match
      let language = languages.find(lang => 
        lang.name.toLowerCase() === normalizedName
      );
      
      // If not found, try partial match
      if (!language) {
        language = languages.find(lang => 
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

// Initialize by fetching languages in the background
apiGetSupportedLanguages().catch(() => {});

export default LanguageVerifier;