// apiServices.js - API service functions for Aoede
import { getConstantValue } from './apiUtilsXXX';

// Import all simplification prompts statically
import getSimplificationPrompt6 from './simplifiers/simplify6';
import getSimplificationPrompt9 from './simplifiers/simplify9';
import getSimplificationPrompt12 from './simplifiers/simplify12';
import getSimplificationPrompt15 from './simplifiers/simplify15';
import getSimplificationPrompt18 from './simplifiers/simplify18';

// Get API keys using updated function
const anthropicKey = getConstantValue('ANTHROPIC_API_KEY');
const googleKey = getConstantValue('GOOGLE_API_KEY');
const openaiKey = getConstantValue('OPENAI_API_KEY');
export const CORS_PROXY = getConstantValue('CORS_PROXY') || '';

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

// NEW FUNCTIONS FOR AOEDE 4.0

// Translate a sentence using OpenAI (cheaper but slower)
export const apiTranslateSentenceCheap = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  const OPENAI_API_KEY = getConstantValue('OPENAI_API_KEY');
  const API_URL = 'https://api.openai.com/v1/chat/completions';
  const TRANSLATION_PROMPT = `Translate the input sentence from ${sourceLang} to ${targetLang}. Return only the translated sentence, with no comments or other output. Input: ${text}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: TRANSLATION_PROMPT
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return text;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return text;
    }

    return data.choices[0].message.content;
  } catch (error) {
    return text;
  }
};

// Translate a sentence using Google Translate (faster but more expensive)
export const apiTranslateSentenceFast = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;
  
  // Don't translate if already in target language
  if (sourceLang === targetLang) {
    return text;
  }

  const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    return text; // Can't translate without API key
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text"
        })
      }
    );
    
    if (!response.ok) {
      return text; // Return original text if translation fails
    }
    
    const data = await response.json();
    
    if (data.data?.translations?.length > 0) {
      const translatedText = data.data.translations[0].translatedText;
      return translatedText;
    }
    
    return text; // Return original text if no translation
  } catch (error) {
    return text; // Return original text on error
  }
};

// Translate and simplify a sentence
export const apiTranslateAndSimplifySentence = async (sourceText, bookLang, studyLang, userLang, readingLevel = 6) => {
  if (__DEV__) console.log("MODULE: apiServices.apiTranslateAndSimplifySentence");

  const openaiKey = getConstantValue('OPENAI_API_KEY');
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const getPrompt = getPromptForLevel(readingLevel);
  const prompt = getPrompt(sourceText, bookLang, studyLang, userLang);

  if (__DEV__) console.log("FETCH 0003");
  if (__DEV__) console.log("MODULE 0030: apiServices.apiTranslateAndSimplifySentence.fetch");

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return null;
    }

    return data.choices[0].message.content;
  } catch (error) {
    return null;
  }
};

// Get supported languages from Google Translate API with caching
export const apiGetSupportedLanguages = async (targetLanguage = 'en') => {
  // Return cached result if available
  if (supportedLanguagesCache) {
    return supportedLanguagesCache;
  }

  const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_API_KEY}&target=${targetLanguage}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    
    if (result.data && result.data.languages) {
      // Store in cache
      supportedLanguagesCache = result.data.languages;
      return result.data.languages;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Text-to-speech using Google TTS API
export const apiTextToSpeech = async (text, languageCode, speakingRate = 1.0, voiceName = null) => {
  const GOOGLE_API_KEY = getConstantValue('GOOGLE_API_KEY');
  
  if (!GOOGLE_API_KEY || !text) {
    return null;
  }
  
  try {
    // Preparing TTS request body
    const requestBody = {
      input: { text: text },
      voice: { 
        languageCode: languageCode,
        ssmlGender: "FEMALE"
      },
      audioConfig: { 
        audioEncoding: "MP3",
        speakingRate: speakingRate
      }
    };
    
    // If a specific voice name is provided, use it
    if (voiceName) {
      requestBody.voice.name = voiceName;
    }
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.audioContent) {
      return null;
    }
    
    return data.audioContent; // Return Base64 encoded audio
  } catch (error) {
    return null;
  }
};