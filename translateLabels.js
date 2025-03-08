import { popularBooks } from './gptBookService';

// Get user language from browser
const userLang = (typeof navigator !== 'undefined' && navigator.language) 
  ? navigator.language.split('-')[0] 
  : "en";

// Try to safely import and use expo-constants
let googleKey = '';
try {
  const Constants = require('expo-constants');
  if (Constants && Constants.expoConfig && Constants.expoConfig.extra) {
    googleKey = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_API_KEY || '';
  }
} catch (error) {
  console.log('Could not load Constants from expo-constants:', error);
}

const labels = [
  "Aoede", "Source Material", "Select a book", "Listen", "Next Sentence",
  "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed",
  "Study Language", "Enter study language", "Stop", "Book Selection", "Reading Level",
  "Switch to Search", "Switch to Book List", "Book Search", "Enter book title or description", "Search"
];

// Enhanced Google Translate API Integration with retry & error handling
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text) return "";
  
  // For logging purposes
  const textPreview = text.substring(0, 50) + (text.length > 50 ? "..." : "");
  console.log(`Translating from ${sourceLang} to ${targetLang}: "${textPreview}"`);
  
  // If user's language is English and source is English, return original
  if (sourceLang === 'en' && targetLang === 'en') {
    return text;
  }

  try {
    if (!googleKey) {
      console.error("Google API Key Missing");
      return text; // Return original text as fallback
    }

    // Ensure we have valid language codes
    const validSourceLang = sourceLang || "auto";
    const validTargetLang = targetLang || "en";

    // First attempt: direct translation
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source: validSourceLang,
          target: validTargetLang,
          format: "text"
        })
      }
    );

    const data = await response.json();

    // Handle API errors
    if (data.error) {
      console.error("Translation API error:", data.error);
      
      // If the error is related to the source language, try with auto-detection
      if (data.error.message && data.error.message.includes("language")) {
        console.log("Retrying with auto-detected source language");
        
        const retryResponse = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              q: text,
              target: validTargetLang,
              format: "text"
            })
          }
        );
        
        const retryData = await retryResponse.json();
        
        if (!retryData.data?.translations || retryData.data.translations.length === 0) {
          return text; // Return original text as fallback
        }
        
        return retryData.data.translations[0].translatedText;
      }
      
      return text; // Return original text as fallback
    }

    if (!data.data?.translations || data.data.translations.length === 0) {
      console.error("No translations in response:", data);
      return text; // Return original text as fallback
    }

    const translatedText = data.data.translations[0].translatedText;
    const resultPreview = translatedText.substring(0, 50) + (translatedText.length > 50 ? "..." : "");
    console.log(`Translation result: "${resultPreview}"`);
    
    return translatedText;
  } catch (error) {
    console.error("Translation failed:", error);
    return text; // Return original text as fallback
  }
};

export const translateLabels = async (setUiText) => {
  try {
    // Determine the target language for UI
    const targetLang = userLang;
    console.log(`Translating UI to language: ${targetLang}`);
    
    // If user's language is English, no need to translate
    if (targetLang === 'en') {
      setUiText({
        appName: "Aoede",
        sourceMaterial: "Source Material",
        enterBook: "Select a book",
        listen: "Listen",
        stop: "Stop",
        next: "Next Sentence",
        loadBook: "Load Book",
        showText: "Show Foreign Sentence",
        showTranslation: "Show Translation",
        readingSpeed: "Reading Speed",
        studyLanguage: "Study Language",
        enterLanguage: "Enter study language",
        bookSelection: "Book Selection",
        readingLevel: "Reading Level",
        switchToSearch: "Switch to Search",
        switchToDropdown: "Switch to Book List",
        bookSearch: "Book Search",
        enterBookSearch: "Enter book title or description",
        searchButton: "Search"
      });
      
      // Also load the English book titles
      const bookTitles = {};
      popularBooks.forEach(book => {
        bookTitles[book.id] = book.title;
      });
      
      setUiText(prev => ({ ...prev, ...bookTitles }));
      return;
    }
    
    // For non-English UI, translate all labels
    console.log(`Translating ${labels.length} UI labels to ${targetLang}`);
    const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", targetLang)));

    const uiTextBase = {
      appName: translatedLabels[0],
      sourceMaterial: translatedLabels[1],
      enterBook: translatedLabels[2],
      listen: translatedLabels[3],
      next: translatedLabels[4],
      loadBook: translatedLabels[5],
      showText: translatedLabels[6],
      showTranslation: translatedLabels[7],
      readingSpeed: translatedLabels[8],
      studyLanguage: translatedLabels[9],
      enterLanguage: translatedLabels[10],
      stop: translatedLabels[11],
      bookSelection: translatedLabels[12],
      readingLevel: translatedLabels[13],
      switchToSearch: translatedLabels[14],
      switchToDropdown: translatedLabels[15],
      bookSearch: translatedLabels[16],
      enterBookSearch: translatedLabels[17],
      searchButton: translatedLabels[18]
    };
    
    // Set the base UI text first
    setUiText(uiTextBase);
    
    // Then translate book titles
    console.log(`Translating ${popularBooks.length} book titles to ${targetLang}`);
    const translatedTitles = {};
    for (const book of popularBooks) {
      try {
        const translatedTitle = await translateText(book.title, "en", targetLang);
        translatedTitles[book.id] = translatedTitle || book.title;
      } catch (error) {
        console.error(`Error translating title for ${book.id}:`, error);
        translatedTitles[book.id] = book.title;
      }
    }
    
    // Update the UI text with book titles
    setUiText(prev => ({ ...prev, ...translatedTitles }));
  } catch (error) {
    console.error("Failed to translate UI labels:", error);
    
    // Fallback to English
    setUiText({
      appName: "Aoede",
      sourceMaterial: "Source Material",
      enterBook: "Select a book",
      listen: "Listen",
      stop: "Stop",
      next: "Next Sentence",
      loadBook: "Load Book",
      showText: "Show Foreign Sentence",
      showTranslation: "Show Translation",
      readingSpeed: "Reading Speed",
      studyLanguage: "Study Language",
      enterLanguage: "Enter study language",
      bookSelection: "Book Selection",
      readingLevel: "Reading Level",
      switchToSearch: "Switch to Search",
      switchToDropdown: "Switch to Book List",
      bookSearch: "Book Search",
      enterBookSearch: "Enter book title or description",
      searchButton: "Search"
    });
  }
};