import { fetchBookTextFromChatGPT, translateText } from './api';

export const loadBook = async (userQuery, studyLanguageCode) => {
  if (!userQuery) {
    console.warn("⚠ No source material entered.");
    return;
  }

  console.log(`📡 DEBUG: Fetching book for query: "${userQuery}"`);
  const { text, language } = await fetchBookTextFromChatGPT(userQuery);

  if (!text || text.trim() === "") {
    console.error("❌ ERROR: No book text received!");
    return;
  }

  console.log(`📢 DEBUG: Raw fetched text: "${text}"`);
  console.log(`📢 DEBUG: Detected language: "${language}"`);
  console.log(`📢 DEBUG: Study Language Code = "${studyLanguageCode}"`);

  if (typeof translateText !== "function") {
    console.error("❌ ERROR: translateText is not a function. Check import in loadBook.js.");
    return;
  }

  console.log(`🔄 Translating from ${language} to ${studyLanguageCode}: ${text}`);

  translateText(text, language, studyLanguageCode)
    .then((translated) => {
      console.log(`✅ DEBUG: Translation successful: "${translated}"`);
    })
    .catch(error => {
      console.error("❌ ERROR: Translation failed:", error);
    });
};