import { translateBookTitles } from './bookLibrary';

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
  "Study Language", "Enter study language", "Stop", "Book Selection", "Reading Level"
];

// Enhanced Google Translate API Integration with retry & error handling
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text) return "";
  if (sourceLang === targetLang) return text;

  // For logging purposes
  const textPreview = text.substring(0, 50) + (text.length > 50 ? "..." : "");
  console.log(`Translating from ${sourceLang} to ${targetLang}: "${textPreview}"`);

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
    // If user's language is English, no need to translate
    if (userLang === 'en') {
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
        readingLevel: "Reading Level"
      });
      
      // Also load the English book titles
      const bookTitles = await translateBookTitles((text) => text);
      setUiText(prev => ({ ...prev, ...bookTitles }));
      return;
    }
    
    const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));

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
      readingLevel: translatedLabels[13]
    };
    
    // Set the base UI text first
    setUiText(uiTextBase);
    
    // Then translate book titles and add them to UI text
    const bookTitles = await translateBookTitles((text, sourceLang, targetLang) => 
      translateText(text, sourceLang || "en", targetLang || userLang)
    );
    
    // Update the UI text with book titles
    setUiText(prev => ({ ...prev, ...bookTitles }));
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
      readingLevel: "Reading Level"
    });
  }
};