// apiServices.js - API service functions for Aoede
import { getConstantValue } from './apiUtilsXXX';

// Import all simplification prompts statically
import getSimplificationPrompt6 from './simplifiers/simplify6';
import getSimplificationPrompt9 from './simplifiers/simplify9';
import getSimplificationPrompt12 from './simplifiers/simplify12';
import getSimplificationPrompt15 from './simplifiers/simplify15';
import getSimplificationPrompt18 from './simplifiers/simplify18';

const NETLIFY_ENDPOINT = "https://aoede-site.netlify.app/.netlify/functions/aoedeapi";

// Global cache for supported languages
let supportedLanguagesCache = null;

// Function to get the appropriate simplification prompt based on reading level
export const getPromptForLevel = (readingLevel) => {
  if (__DEV__) console.log("MODULE 0028: apiServices.getPromptForLevel");

  const level = readingLevel || 6;

  const promptMap = {
    6: getSimplificationPrompt6,
    9: getSimplificationPrompt9,
    12: getSimplificationPrompt12,
    15: getSimplificationPrompt15,
    18: getSimplificationPrompt18
  };

  return promptMap[level] || getSimplificationPrompt6;
};

// Process the source text - translate and simplify
export const processSourceText = async (sourceText, bookLang, studyLang, userLang, readingLevel = 6) => {
  if (__DEV__) console.log("MODULE 0029: apiServices.processSourceText");
  
  // Use the new apiTranslateAndSimplifySentence function
  return await apiTranslateAndSimplifySentence(sourceText, bookLang, studyLang, userLang, readingLevel);
};

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

export async function apiTextToSpeech(text, languageCode, speakingRate = 1.0, voiceName = null) {
  return await callAoedeAPI({
    mode: "tts",
    text,
    languageCode,
    speakingRate,
    voiceName,
  });
}
