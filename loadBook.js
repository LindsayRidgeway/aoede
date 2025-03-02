import { detectedLanguageCode } from './listeningSpeed';
import { fetchBookTextFromChatGPT, translateText } from './api';

export const loadBook = async (userQuery, setLoadingBook, setSentence, setDetectedLanguage, studyLanguage, setTranslatedSentence) => {
  if (!userQuery) return;

  setLoadingBook(true);

  try {
    // Fetch book text in its original language
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    
    // Store the original language
    let sourceLanguage = language ? language.toLowerCase().trim() : "en";
    sourceLanguage = sourceLanguage.replace(/[^a-z]/g, "");
    if (!/^[a-z]{2}$/i.test(sourceLanguage)) {
      sourceLanguage = "en";
    }
    
    setDetectedLanguage(sourceLanguage);
    
    // Determine system language (for translation display)
    const systemLanguage = navigator.language.split('-')[0] || "en";
    
    // If the source material is already in the study language, we're good
    if (sourceLanguage === detectedLanguageCode) {
      setSentence(text);
      // Translate to system language for the translation display
      const translatedToSystem = await translateText(text, sourceLanguage, systemLanguage);
      setTranslatedSentence(translatedToSystem.replace(/^"|"$/g, ""));
    } 
    // If not, we need to translate to the study language
    else {
      // First translate to study language for foreign sentence display
      const translatedToStudy = await translateText(text, sourceLanguage, detectedLanguageCode);
      setSentence(translatedToStudy.replace(/^"|"$/g, ""));
      
      // Then translate to system language for translation display
      if (detectedLanguageCode === systemLanguage) {
        // If study language is same as system language, use the same translation
        setTranslatedSentence(translatedToStudy.replace(/^"|"$/g, ""));
      } else {
        // Otherwise translate to system language
        const translatedToSystem = await translateText(text, sourceLanguage, systemLanguage);
        setTranslatedSentence(translatedToSystem.replace(/^"|"$/g, ""));
      }
    }
  } catch (error) {
    setSentence("Error loading content.");
    setTranslatedSentence("Translation failed. Please try again.");
  } finally {
    setLoadingBook(false);
  }
};