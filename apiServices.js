// apiServices.js - API service functions for Aoede

const NETLIFY_ENDPOINT = "https://aoede-site.netlify.app/.netlify/functions/aoedeapi";

// Global cache for supported languages
let supportedLanguagesCache = null;

async function callAoedeAPI(payload) {
  try {
    const response = await fetch(NETLIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("API call failed:", error);
    return null;
  }
}

export async function apiTranslateSentenceCheap(text, sourceLang, targetLang) {
  return await callAoedeAPI({
    mode: "translateOpenAI",
    text,
    sourceLang,
    targetLang,
  });
}

export async function apiTranslateSentenceFast(text, sourceLang, targetLang) {
  return await callAoedeAPI({
    mode: "translateGoogle",
    text,
    sourceLang,
    targetLang,
  });
}

export async function apiTranslateAndSimplifySentence(text, bookLang, studyLang, userLang, readingLevel) {
  return await callAoedeAPI({
    mode: "simplify",
    text,
    bookLang,
    studyLang,
    userLang,
    readingLevel,
  });
}

export async function apiGetSupportedLanguages(targetLang = "en") {
  return await callAoedeAPI({
    mode: "getLanguages",
    targetLang,
  });
}

export async function apiGetGoogleVoices() {
  return await callAoedeAPI({
    mode: "getGoogleVoices",
  });
}

export async function apiTextToSpeech(text, languageCode, speakingRate = 1.0, voiceName = null) {
  return await callAoedeAPI({
    mode: "tts",
    text,
    languageCode,
    speakingRate,
    voiceName,
  });
}
