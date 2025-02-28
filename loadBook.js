import { fetchBookTextFromChatGPT, translateText } from './api';

export const loadBook = async (userQuery, setLoadingBook, setSentence, setDetectedLanguage, studyLanguage, setTranslatedSentence) => {
  if (!userQuery) return;

  setLoadingBook(true);

  try {
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    setSentence(text);
    setDetectedLanguage(language || "en");

    let validSourceLang = language ? language.toLowerCase().trim() : "en";
    validSourceLang = validSourceLang.replace(/[^a-z]/g, "");

    if (!/^[a-z]{2}$/i.test(validSourceLang)) {
      console.warn(`⚠ AI returned invalid language code: "${validSourceLang}". Defaulting to "en".`);
      validSourceLang = "en";
    }

    console.log(`🔍 Translating from ${validSourceLang} to ${studyLanguage}:`, text);

    if (typeof translateText !== "function") {
      console.error("❌ translateText is not a function. Check import in loadBook.js.");
      return;
    }

    if (validSourceLang === studyLanguage) {
      setTranslatedSentence(text);
    } else {
      const translated = await translateText(text, validSourceLang, studyLanguage);
      setTranslatedSentence(translated.replace(/^"|"$/g, ""));
    }
  } catch (error) {
    console.error("❌ Book loading failed:", error);
  } finally {
    setLoadingBook(false);
  }
};