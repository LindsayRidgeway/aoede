import { detectedLanguageCode } from './listeningSpeed';
import { fetchBookTextFromChatGPT, translateText } from './api';

export const loadBook = async (userQuery, setLoadingBook, setSentence, setDetectedLanguage, studyLanguage, setTranslatedSentence) => {
  if (!userQuery) return;

  setLoadingBook(true);
  console.log("Loading book:", userQuery);
  console.log("Study language:", studyLanguage);
  console.log("Detected language code:", detectedLanguageCode);
  console.log("Browser language:", navigator.language);

  try {
    // Fetch book text in its original language
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    console.log("Received original text:", text);
    console.log("Original language:", language);
    
    // Store the original language
    let sourceLanguage = language ? language.toLowerCase().trim() : "en";
    sourceLanguage = sourceLanguage.replace(/[^a-z]/g, "");
    if (!/^[a-z]{2}$/i.test(sourceLanguage)) {
      console.warn(`⚠ AI returned invalid language code: "${sourceLanguage}". Defaulting to "en".`);
      sourceLanguage = "en";
    }
    
    setDetectedLanguage(sourceLanguage);
    
    // Determine system language (for translation display)
    const systemLanguage = navigator.language.split('-')[0] || "en";
    
    // If the source material is already in the study language, we're good
    if (sourceLanguage === detectedLanguageCode) {
      console.log("Book is already in study language, using as-is");
      setSentence(text);
      // Translate to system language for the translation display
      const translatedToSystem = await translateText(text, sourceLanguage, systemLanguage);
      setTranslatedSentence(translatedToSystem.replace(/^"|"$/g, ""));
    } 
    // If not, we need to translate to the study language
    else {
      console.log("Translating book to study language:", detectedLanguageCode);
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
    console.error("❌ Book loading failed:", error);
    setSentence("Error loading content.");
    setTranslatedSentence("Translation failed. Please try again.");
  } finally {
    setLoadingBook(false);
  }
};